import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyUrls } from "@/lib/url-verify";

type FetchMock = ReturnType<typeof vi.fn>;
let fetchMock: FetchMock;

function mockResponse(status: number) {
  return new Response(null, { status });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyUrls", () => {
  it("classifies 2xx HEAD as ok", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200));
    const r = await verifyUrls(["https://a.example/ok"]);
    expect(r.ok).toEqual(["https://a.example/ok"]);
    expect(r.dead).toEqual([]);
    expect(r.unknown).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    expect(call[1].method).toBe("HEAD");
  });

  it("classifies 3xx HEAD as ok (redirect followed)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(301));
    const r = await verifyUrls(["https://a.example/redirect"]);
    expect(r.ok.length).toBe(1);
  });

  it("classifies 404 HEAD as dead", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(404));
    const r = await verifyUrls(["https://a.example/missing"]);
    expect(r.dead).toEqual(["https://a.example/missing"]);
    expect(r.results[0]?.httpStatus).toBe(404);
  });

  it("falls back to GET on 405 HEAD and uses the GET status", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(405))
      .mockResolvedValueOnce(mockResponse(200));
    const r = await verifyUrls(["https://a.example/no-head"]);
    expect(r.ok).toEqual(["https://a.example/no-head"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![1].method).toBe("GET");
    expect(fetchMock.mock.calls[1]![1].headers.Range).toBe("bytes=0-0");
  });

  it("falls back to GET on network error and reports unknown if GET also fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("still down"));
    const r = await verifyUrls(["https://a.example/flaky"]);
    expect(r.unknown).toEqual(["https://a.example/flaky"]);
  });

  it("falls back to GET on HEAD network error and recovers if GET succeeds", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(mockResponse(200));
    const r = await verifyUrls(["https://a.example/recover"]);
    expect(r.ok).toEqual(["https://a.example/recover"]);
  });

  it("rejects invalid URLs without making a request", async () => {
    const r = await verifyUrls(["not-a-url"]);
    expect(r.dead).toEqual(["not-a-url"]);
    expect(r.results[0]?.error).toBe("invalid_url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dedupes identical URLs", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200));
    const r = await verifyUrls([
      "https://a.example/x",
      "https://a.example/x",
      " https://a.example/x ",
    ]);
    expect(r.ok.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns three buckets for a mixed batch", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(200)) // ok
      .mockResolvedValueOnce(mockResponse(404)) // dead
      .mockRejectedValueOnce(new Error("timeout")) // HEAD fail
      .mockRejectedValueOnce(new Error("timeout")); // GET fail → unknown
    const r = await verifyUrls([
      "https://a.example/ok",
      "https://a.example/missing",
      "https://a.example/flaky",
    ]);
    expect(r.ok).toEqual(["https://a.example/ok"]);
    expect(r.dead).toEqual(["https://a.example/missing"]);
    expect(r.unknown).toEqual(["https://a.example/flaky"]);
  });
});
