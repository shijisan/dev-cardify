import { Ubuntu, Roboto_Flex } from "next/font/google";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"]
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  weight: ["variable"],
});

export const metadata = {
  title: "dev-cardify",
  description: "Turn your url to a preview card!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${ubuntu.variable} ${robotoFlex.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
