import { chromium } from 'playwright';
import { createCanvas, loadImage } from 'canvas';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import ico from 'sharp-ico';
import axios from 'axios';

export async function POST(req) {
	const { url } = await req.json();

	if (!url) {
		return NextResponse.json({ error: 'URL is required' }, { status: 400 });
	}

	// Variables to easily manipulate at the top
	const canvasWidth = 500;
	const canvasHeight = 500;
	const iconSize = 100;
	const titleFont = 'bold 30px Arial';
	const descriptionFont = '20px Arial';

	let browser;
	try {
		browser = await chromium.launch();
		const page = await browser.newPage();
		await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

		const pageTitle = await page.title() || 'Website Title';
		const pageDescription = await getMetaDescription(page);
		const colors = await extractColors(page);
		const faviconUrl = await getFaviconUrl(page);

		const mainColor = processColor(colors.navbarBackground) || processColor(colors.bodyBackgroundColor) || '#ffffff';
		const headerColor = processColor(colors.headerText) || processColor(colors.bodyTextColor) || '#000000';
		const anchorColor = processColor(colors.anchorText) ||  processColor(colors.bodyTextColor)  ||'#555555';

		// Create canvas and set background
		const canvas = createCanvas(canvasWidth, canvasHeight);
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = mainColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Calculate text and image positions
		const titleX = canvas.width / 2;
		const titleY = 150;
		const descriptionY = canvas.height - 150;
		const iconX = (canvas.width - iconSize) / 2;
		const iconY = (canvas.height - iconSize) / 2;

		// Add title
		ctx.fillStyle = headerColor;
		ctx.font = titleFont;
		ctx.textAlign = 'center';
		wrapText(ctx, pageTitle, titleX, titleY, 460, 40, true);

		// Process favicon and add logo image
		const logoImage = await processFavicon(faviconUrl, iconSize);
		ctx.drawImage(logoImage, iconX, iconY, iconSize, iconSize);

		// Set description text color and add description
		ctx.fillStyle = anchorColor;
		ctx.font = descriptionFont;
		wrapText(ctx, pageDescription, titleX, descriptionY, 460, 30);

		return NextResponse.json({
			cardImage: canvas.toDataURL(),
		});
	} catch (error) {
		console.error('Error generating card:', error);
		return NextResponse.json({ error: 'Failed to generate card' }, { status: 500 });
	} finally {
		if (browser) await browser.close();
	}
}

// Function to extract meta description from the page
async function getMetaDescription(page) {
	return await page.$eval('meta[name="description"]', (meta) => meta?.content).catch(() => '');
}

// Function to extract colors from the page
async function extractColors(page) {
	return await page.evaluate(() => {
		const navbar = document.querySelector('nav, header, .header, .navbar, #header, #navbar');
		const header = navbar?.querySelector('h1, h2, h3, h4, h5, h6, .brand, .logo-text');
		const anchor = navbar?.querySelector('a, .nav-link, .menu-item, li');
		const bodyBackgroundColor = window.getComputedStyle(document.body).backgroundColor;
		const bodyTextColor = window.getComputedStyle(document.body).color;

		return {
			navbarBackground: navbar ? window.getComputedStyle(navbar).backgroundColor : null,
			headerText: header ? window.getComputedStyle(header).color : null,
			anchorText: anchor ? window.getComputedStyle(anchor).color : null,
			bodyBackgroundColor: bodyBackgroundColor || '#ffffff',
			bodyTextColor: bodyTextColor || '##D3D3D3',
		};
	});
}

// Function to get favicon URL from the page
async function getFaviconUrl(page) {
	const faviconLinks = await page.evaluate(() => {
		const links = document.querySelectorAll('link[rel*="icon"]');
		return Array.from(links).map(link => ({
			href: link.href,
			rel: link.rel,
			type: link.type,
		}));
	});

	if (!faviconLinks.length) {
		throw new Error('No favicon found');
	}

	return faviconLinks.find(link => link.type === 'image/png')?.href ||
		faviconLinks.find(link => link.href.endsWith('.png'))?.href ||
		faviconLinks[0].href;
}

// Function to process favicon image
async function processFavicon(faviconUrl, iconSize) {
	const response = await axios({
		method: 'get',
		url: faviconUrl,
		responseType: 'arraybuffer',
	});

	const fileExt = faviconUrl.toLowerCase().split('.').pop();
	let iconBuffer;

	if (fileExt === 'ico') {
		const icons = await ico.sharpsFromIco(Buffer.from(response.data));
		const hdIcon = icons[icons.length - 1];
		iconBuffer = await hdIcon
			.resize(iconSize, iconSize, {
				fit: 'contain',
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			})
			.png()
			.toBuffer();
	} else {
		iconBuffer = await sharp(response.data)
			.resize(iconSize, iconSize, {
				fit: 'contain',
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			})
			.png()
			.toBuffer();
	}

	return loadImage(iconBuffer);
}

// Function to process color to hex
function processColor(color) {
	if (!color) return null;
	if (color.startsWith('rgb')) {
		const rgb = color.match(/\d+/g);
		if (!rgb || rgb.length < 3) return null;
		return rgbToHex(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
	}
	return color;
}

// Function to convert RGB to Hex
function rgbToHex(r, g, b) {
	return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// Function to wrap text within a specific width and truncate if necessary
function wrapText(ctx, text, x, y, maxWidth, lineHeight, truncate = false) {
	if (!text) return;
	const words = text.split(' ');
	let line = '';
	let posY = y;

	// Check if truncation is needed (only for title)
	if (truncate && ctx.measureText(text).width > maxWidth) {
		// Truncate and add ellipses
		console.log("Title too long. Truncating...");
		text = text.substring(0, Math.floor(text.length * maxWidth / ctx.measureText(text).width) - 3) + '...';
	}

	// Split the text into words and proceed with wrapping
	const truncatedWords = text.split(' ');

	for (const word of truncatedWords) {
		const testLine = line + (line ? ' ' : '') + word;
		const metrics = ctx.measureText(testLine);

		if (metrics.width > maxWidth && line) {
			ctx.fillText(line, x, posY);
			line = word;
			posY += lineHeight;
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, posY);
}
