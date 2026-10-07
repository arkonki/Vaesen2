import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import middleware from "../src/middleware";

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));
const token = { id: "user", role: "PLAYER", sessionVersion: 0 };
const request = (path: string) => new NextRequest(`http://localhost:2019${path}`);

describe("proxy-safe authentication redirects", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_URL", "https://vaesen.example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "middleware-test-only-secret");
    vi.mocked(getToken).mockReset().mockResolvedValue(null);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("redirects signed-out protected pages to the public HTTPS login, not localhost", async () => {
    for (const path of ["/", "/characters", "/parties", "/compendium", "/admin"]) {
      const response = await middleware(request(path));
      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://vaesen.example.com");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe(path);
    }
  });
  it("preserves only the original local path and query in the callback", async () => {
    const response = await middleware(request("/characters?sort=name"));
    expect(new URL(response.headers.get("location")!).searchParams.get("callbackUrl")).toBe("/characters?sort=name");
  });
  it("ignores attacker-controlled forwarded hosts", async () => {
    const req = new NextRequest("http://localhost:2019/", { headers: { "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" } });
    expect((await middleware(req)).headers.get("location")).toBe("https://vaesen.example.com/login?callbackUrl=%2F");
  });
  it("keeps role-denied redirects on the public origin", async () => {
    vi.mocked(getToken).mockResolvedValue(token);
    for (const path of ["/admin", "/gm"]) {
      expect((await middleware(request(path))).headers.get("location")).toBe("https://vaesen.example.com/");
    }
    vi.mocked(getToken).mockResolvedValue({ ...token, role: "GM" });
    expect((await middleware(request("/admin"))).headers.get("location")).toBe("https://vaesen.example.com/");
    expect((await middleware(request("/gm"))).headers.get("location")).toBeNull();
    vi.mocked(getToken).mockResolvedValue({ ...token, role: "ADMIN" });
    expect((await middleware(request("/admin"))).headers.get("location")).toBeNull();
  });
  it("allows a valid player's ordinary routes", async () => {
    vi.mocked(getToken).mockResolvedValue(token);
    expect((await middleware(request("/characters"))).headers.get("location")).toBeNull();
    expect(getToken).toHaveBeenCalledWith(expect.objectContaining({ secret: "middleware-test-only-secret" }));
  });
  it("rejects invalid, legacy and malformed tokens", async () => {
    for (const invalid of [{ ...token, invalid: true }, { ...token, id: "" }, { ...token, role: "UNKNOWN" }, { ...token, sessionVersion: -1 }, { ...token, sessionVersion: 1.5 }, { id: "user", role: "PLAYER" }]) {
      vi.mocked(getToken).mockResolvedValue(invalid);
      expect(new URL((await middleware(request("/"))).headers.get("location")!).pathname).toBe("/login");
    }
  });
  it("uses the request origin for unconfigured local development", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    expect(new URL((await middleware(request("/"))).headers.get("location")!).origin).toBe("http://localhost:2019");
  });
  it("fails closed on the public origin when the auth secret is missing", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect((await middleware(request("/"))).headers.get("location")).toBe("https://vaesen.example.com/api/auth/error?error=Configuration");
    expect(getToken).not.toHaveBeenCalled();
  });
});
