
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function request(path, { method = "GET", token, body, form } = {}) {
  const headers = { Accept: "application/json" };
  let requestBody;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    requestBody = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: requestBody,
    });
  } catch {
    throw new Error(
      "Cannot reach the Paisa API. Make sure the FastAPI server is running."
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const payload = await response.json();
      message =
        typeof payload.detail === "string" ? payload.detail : message;
    } catch {
      // The response body may be empty.
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function apiRequest(path, options) {
  return request(path, options);
}

export async function loginUser(email, password) {
  return request("/auth/login", {
    method: "POST",
    form: {
      username: email,
      password,
    },
  });
}

export function signupUser({ name, email, password }) {
  return request("/auth/signup", {
    method: "POST",
    body: {
      name: name.trim(),
      email: email.trim(),
      password,
    },
  });
}
