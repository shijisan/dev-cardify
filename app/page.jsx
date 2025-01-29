"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false); // To manage loading state
  const [error, setError] = useState(""); // To manage error state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading
    setError(""); // Reset previous error

    if (!url) {
      setError("Please enter a valid URL");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/cardify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setCardData(data);
      } else {
        setError("Error generating the card. Please try again.");
      }
    } catch (error) {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="min-h-screen w-full flex justify-center items-center">
        <div className="w-1/2 flex justify-center items-center">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg bg-white border border-neutral-300 shadow max-w-sm w-full flex flex-col p-4 text-neutral-800"
          >
            <h1 className="text-3xl font-medium ubuntu mb-1">
              <span className="text-fuchsia-500">Cardify</span> your URL here:
            </h1>
            <p className="font-medium text-sm tracking-wide mb-4 text-justify">
              Turn your website into a beautiful preview using its own color palette, logo, title, and description!
            </p>

            <div className="flex flex-col mb-4">
              <label className="mb-1 text-sm font-medium" htmlFor="url">
                Url:
              </label>
              <input
                className="py-2 px-4 border-2 border-b-4 rounded-t border-b-fuchsia-500 focus:border-b-fuchsia-500 focus:outline-none caret-fuchsia-500 placeholder-shown:border-b-neutral-300 bg-neutral-100"
                type="url"
                name="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-full bg-gradient-to-br text-sm font-medium from-fuchsia-500 to-pink-200 text-white hover:scale-[101%] hover:transition-transform shadow"
              disabled={loading} // Disable the button while loading
            >
              {loading ? "Generating..." : "Cardify"}
            </button>
          </form>
        </div>

        <div className="w-1/2 flex justify-center items-center">
          <div className="rounded-lg bg-white border border-neutral-300 shadow max-w-sm w-full flex flex-col p-4 text-neutral-800">
            <h1 className="text-3xl text-center ubuntu font-medium mb-2">Output</h1>
            <div className="border-4 border-neutral-300 rounded h-96 w-full flex justify-center items-center">
              {loading ? (
                <p className="text-center text-sm text-gray-500">Generating card...</p>
              ) : error ? (
                <p className="text-center text-sm text-red-500">{error}</p>
              ) : cardData ? (
                <img src={cardData.cardImage} alt="Generated Card" className="w-full h-full object-cover" />
              ) : (
                <p className="text-center text-sm text-gray-500">Card will appear here...</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
