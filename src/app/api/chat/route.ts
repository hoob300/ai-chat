import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const WEATHER_KEYWORDS = ['날씨', '기온', '온도', '비', '눈', '맑', '흐림', '바람', 'weather', 'temperature', 'rain', 'snow', 'forecast']

const WEATHER_CODE: Record<number, string> = {
  0: '맑음', 1: '대체로 맑음', 2: '부분적으로 흐림', 3: '흐림',
  45: '안개', 48: '짙은 안개',
  51: '이슬비(약)', 53: '이슬비(보통)', 55: '이슬비(강)',
  61: '비(약)', 63: '비(보통)', 65: '비(강)',
  71: '눈(약)', 73: '눈(보통)', 75: '눈(강)',
  80: '소나기(약)', 81: '소나기(보통)', 82: '소나기(강)',
  95: '천둥번개', 99: '천둥번개+우박',
}

// 도시명 추출 (한국어/영어)
function extractCity(text: string): string {
  const cityMap: Record<string, string> = {
    '서울': 'Seoul', '부산': 'Busan', '인천': 'Incheon', '대구': 'Daegu',
    '대전': 'Daejeon', '광주': 'Gwangju', '수원': 'Suwon', '제주': 'Jeju',
    '울산': 'Ulsan', '창원': 'Changwon',
  }
  for (const [ko, en] of Object.entries(cityMap)) {
    if (text.includes(ko)) return en
  }
  // 영어 도시명 패턴
  const match = text.match(/in ([A-Z][a-z]+)/i)
  if (match) return match[1]
  return 'Seoul' // 기본값
}

async function getWeather(city: string): Promise<string> {
  try {
    // 1. 도시명 → 좌표 변환
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ko`
    )
    const geoData = await geoRes.json()
    if (!geoData.results?.length) return ''

    const { latitude, longitude, name, country } = geoData.results[0]

    // 2. 날씨 조회
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=Asia%2FSeoul&forecast_days=1`
    )
    const w = await weatherRes.json()
    const c = w.current
    const d = w.daily

    const condition = WEATHER_CODE[c.weather_code] ?? '알 수 없음'

    return `[실시간 날씨 데이터 - ${name}, ${country}]
현재 날씨: ${condition}
현재 기온: ${c.temperature_2m}°C (체감 ${c.apparent_temperature}°C)
최고/최저: ${d.temperature_2m_max[0]}°C / ${d.temperature_2m_min[0]}°C
습도: ${c.relative_humidity_2m}%
풍속: ${c.wind_speed_10m} km/h
강수량: ${c.precipitation} mm
조회 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
  } catch {
    return ''
  }
}

function isWeatherQuery(text: string): boolean {
  return WEATHER_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
}

export async function POST(req: NextRequest) {
  const { messages, isWeather } = await req.json()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  try {
    // 마지막 사용자 메시지 확인
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? ''

    // 날씨 질문이면 실시간 데이터 주입
    let systemPrompt = '당신은 친절한 AI 어시스턴트입니다. 한국어로 답변해주세요.'
    if (isWeather || isWeatherQuery(lastUserMsg)) {
      const city = extractCity(lastUserMsg)
      const weatherData = await getWeather(city)
      if (weatherData) {
        systemPrompt = `당신은 친절한 AI 어시스턴트입니다. 한국어로 답변해주세요.
아래는 방금 조회한 실시간 날씨 정보입니다. 이 데이터를 바탕으로 자연스럽게 답변하세요.

${weatherData}`
      }
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
