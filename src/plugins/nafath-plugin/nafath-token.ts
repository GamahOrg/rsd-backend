const APIGEE_URL = process.env.APIGEE_URL || "https://api-test.rega.gov.sa";
const APIGEE_CLIENT_ID = process.env.APIGEE_CLIENT_ID || "7vprSgxhRD1hbyGqAKWsY8HXOIb7kYO1";
const APIGEE_CLIENT_SECRET = process.env.APIGEE_CLIENT_SECRET || "siakAvMxes1AADh6";

let cachedToken: {
  token: string;
  expiresAt: number;
} | null = null;

export async function getNafathToken() {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const response = await fetch(APIGEE_URL + "/v1/oauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: APIGEE_CLIENT_ID,
        client_secret: APIGEE_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get Nafath token");
    }

    const data = await response.json();

    // Cache the token with expiration time (subtracting 5 minutes for safety margin)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (parseInt(data.expires_in) - 300) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error("Error getting Nafath token:", error);
    throw error;
  }
}
