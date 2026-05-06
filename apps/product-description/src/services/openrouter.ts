export interface ProductDescription {
  url: string;
  description: string;
  error?: string;
}

export async function generateProductDescription(url: string): Promise<ProductDescription> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        (data?.error && typeof data.error === "string" && data.error) ||
          `Request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as ProductDescription;
  } catch (error: any) {
    console.error("Error generating description for", url, error);
    return { 
      url, 
      description: "", 
      error: error.message || "Failed to generate description. Please ensure the URL is accessible." 
    };
  }
}
