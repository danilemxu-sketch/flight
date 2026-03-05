// api/flights.js
// Vercel Serverless Function —— 代理 AviationStack，解决 CORS + 隐藏 API Key

export default async function handler(req, res) {
  const { dep_iata, arr_iata } = req.query;

  if (!dep_iata || !arr_iata) {
    return res.status(400).json({ error: "缺少 dep_iata 或 arr_iata 参数" });
  }

  const url = new URL("http://api.aviationstack.com/v1/flights");
  url.searchParams.set("access_key", process.env.AVIATIONSTACK_KEY);
  url.searchParams.set("dep_iata", dep_iata);
  url.searchParams.set("arr_iata", arr_iata);
  url.searchParams.set("limit", "100");

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: "上游请求失败", detail: e.message });
  }
}
