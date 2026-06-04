/* HeartPin · sample journey data (placeholder photos) + data helpers */

// ratio: aspect-ratio string · tint: warm|cool|sage|gold
function p(label, ratio, tint) { return { label, ratio: ratio || "4/3", tint: tint || "cool" }; }

const busan = {
  id: "busan",
  region: "domestic",
  start: "2025-10-11",
  title: "2박 3일 부산",
  dateLabel: "2025.10.11 – 10.13",
  cover: { label: "부산 · 광안대교 야경", tint: "cool" },
  tags: ["바다", "야경", "2박3일"],
  days: [
    {
      label: "Day 1", date: "10.11 토", spots: [
        {
          id: "haeundae", name: "해운대 해수욕장", time: "11:40", lat: 35.1587, lng: 129.1604, mood: "탁 트인 바다",
          guide: "도착하자마자 해운대! 백사장이 1.5km나 이어져서 끝이 안 보여. 모래가 곱기로 유명한 곳이야.",
          reaction: "우와아 바다다!! 파도 소리 들려? 발 담그고 싶다 🫧",
          photos: [p("해운대 백사장 파노라마", "16/10", "cool"), p("발자국 남긴 모래사장", "1/1", "gold"), p("둘이서 셀카", "3/4", "warm"), p("갈매기 떼", "4/3", "cool")]
        },
        {
          id: "dongbaek", name: "동백섬 산책로", time: "15:20", lat: 35.1538, lng: 129.1500, mood: "노을 산책",
          guide: "해운대 옆 동백섬. 해안 데크길을 한 바퀴 돌면 누리마루랑 등대가 나와. 노을 시간대가 제일 예뻐.",
          reaction: "노을이 주황색이야… 바라 얼굴도 주황색 됐어 ㅎㅎ",
          photos: [p("해안 데크 산책로", "3/4", "warm"), p("동백섬 등대", "4/3", "warm"), p("노을 진 바다", "16/10", "gold")]
        }
      ]
    },
    {
      label: "Day 2", date: "10.12 일", spots: [
        {
          id: "gamcheon", name: "감천문화마을", time: "10:30", lat: 35.0974, lng: 129.0106, mood: "알록달록 골목",
          guide: "산비탈을 따라 집들이 계단처럼 쌓인 마을이야. '한국의 마추픽추'라고도 불러. 골목마다 벽화랑 작은 갤러리가 숨어 있어.",
          reaction: "집들이 레고 같아!! 어린왕자 동상 옆에서 사진 찍자 📸",
          photos: [p("파스텔 지붕 전경", "16/10", "warm"), p("어린왕자 포토존", "3/4", "cool"), p("벽화 골목", "1/1", "sage"), p("계단 카페", "4/3", "gold")]
        },
        {
          id: "jagalchi", name: "자갈치시장", time: "13:10", lat: 35.0967, lng: 129.0305, mood: "활기찬 점심",
          guide: "한국 최대 수산시장. 1층에서 회 고르면 2층에서 바로 차려줘. '오이소 보이소 사이소' 사투리가 정겨운 곳.",
          reaction: "회 냄새가… 아니 좋은 냄새야! 나도 한 점만…🥺",
          photos: [p("좌판 가득한 해산물", "4/3", "cool"), p("2층 회센터 한 상", "16/10", "warm"), p("시장 골목", "3/4", "sage")]
        }
      ]
    },
    {
      label: "Day 3", date: "10.13 월", spots: [
        {
          id: "huinnyeoul", name: "흰여울문화마을", time: "10:00", lat: 35.0785, lng: 129.0460, mood: "영화 같은 절벽",
          guide: "영도 절벽 위 하얀 마을. 바다가 바로 발밑이라 '부산의 산토리니'라고 불려. 영화 〈변호인〉 촬영지이기도 해.",
          reaction: "골목 끝마다 바다가 짠— 하고 나타나! 숨바꼭질 같아 🌊",
          photos: [p("절벽 위 흰 집들", "16/10", "cool"), p("바다 보이는 골목", "3/4", "cool"), p("계단길", "1/1", "warm")]
        },
        {
          id: "gwangalli", name: "광안리 해변", time: "18:30", lat: 35.1532, lng: 129.1185, mood: "다리 야경",
          guide: "마지막 코스는 광안리. 해가 지면 광안대교에 조명이 들어와. 해변 카페에 앉아 야경 보며 여행을 마무리했어.",
          reaction: "다리에 불 켜졌다!! 오늘 제일 예쁜 거 같아… 또 오자 우리 💙",
          photos: [p("광안대교 야경", "16/10", "cool"), p("해변 카페 창가", "3/4", "warm"), p("야경 셀카", "1/1", "warm"), p("모래 위 발자국", "4/3", "gold")]
        }
      ]
    }
  ]
};

const kansai = {
  id: "kansai",
  region: "intl",
  start: "2025-05-03",
  title: "4박 5일 오사카·교토",
  dateLabel: "2025.05.03 – 05.07",
  cover: { label: "교토 · 후시미 이나리 천 개의 토리이", tint: "warm" },
  tags: ["벚꽃끝물", "맛집", "신사"],
  days: [
    {
      label: "Day 1", date: "5.3 오사카", spots: [
        {
          id: "dotonbori", name: "도톤보리", time: "19:00", lat: 34.6686, lng: 135.5012, mood: "네온 먹거리",
          guide: "오사카의 심장, 도톤보리! 글리코 간판 앞은 인증샷 필수야. 다코야키랑 오코노미야키 냄새가 운하를 따라 흐르는 곳.",
          reaction: "간판이 다 움직여!! 다코야키 몇 개까지 먹어도 돼…? 👀",
          photos: [p("글리코 간판 & 운하", "16/10", "cool"), p("다코야키 클로즈업", "1/1", "warm"), p("네온 거리", "3/4", "warm"), p("운하 유람선", "4/3", "cool")]
        }
      ]
    },
    {
      label: "Day 2", date: "5.4 오사카", spots: [
        {
          id: "osakajo", name: "오사카성", time: "10:40", lat: 34.6873, lng: 135.5258, mood: "초록 정원",
          guide: "도요토미 히데요시가 지은 성. 천수각 꼭대기에 오르면 오사카 시내가 한눈에 보여. 봄엔 벚꽃, 우린 끝물을 살짝 만났지.",
          reaction: "성이 금빛이야! 해자에 비친 거 봐봐, 두 채 같지? ✨",
          photos: [p("천수각 전경", "3/4", "sage"), p("해자에 비친 성", "16/10", "cool"), p("정원 벚꽃잎", "1/1", "warm")]
        },
        {
          id: "shinsekai", name: "신세카이", time: "18:20", lat: 34.6524, lng: 135.5062, mood: "레트로 골목",
          guide: "100년 전 '신세계'를 꿈꾸며 만든 동네. 츠텐카쿠 타워 아래로 쿠시카츠 가게가 늘어서 있어. 옛날 오사카 분위기 그대로야.",
          reaction: "여긴 시간이 멈춘 것 같아~ 쿠시카츠 소스 두 번 찍으면 혼난대 ㅋㅋ",
          photos: [p("츠텐카쿠 타워", "3/4", "warm"), p("쿠시카츠 한 접시", "1/1", "gold"), p("레트로 간판 골목", "16/10", "warm")]
        }
      ]
    },
    {
      label: "Day 3", date: "5.5 교토", spots: [
        {
          id: "fushimi", name: "후시미 이나리", time: "09:30", lat: 34.9671, lng: 135.7727, mood: "붉은 토리이",
          guide: "교토 도착! 천 개의 주홍빛 토리이가 산길을 따라 이어져. 정상까지 두 시간, 우린 중턱 전망대까지만 올랐어.",
          reaction: "터널이 끝이 없어!! 주황주황한 게 내 최애 색이야 🦊",
          photos: [p("토리이 터널", "3/4", "warm"), p("여우 석상", "1/1", "gold"), p("산중턱 전망", "16/10", "sage")]
        }
      ]
    },
    {
      label: "Day 4", date: "5.6 교토", spots: [
        {
          id: "kiyomizu", name: "기요미즈데라", time: "11:00", lat: 34.9949, lng: 135.7850, mood: "절벽 사찰",
          guide: "절벽 위에 못 하나 안 쓰고 지은 본당이 유명해. 무대에서 내려다보는 교토 시내가 장관이야. 가는 길 골목(산넨자카)도 예뻐.",
          reaction: "나무 무대가 공중에 떠 있는 것 같아! 안 무서워? 난 바라 손 잡을래 🫶",
          photos: [p("본당 무대 전경", "16/10", "sage"), p("산넨자카 골목", "3/4", "warm"), p("교토 시내 조망", "4/3", "cool")]
        },
        {
          id: "arashiyama", name: "아라시야마 대나무숲", time: "16:00", lat: 35.0094, lng: 135.6737, mood: "초록 대숲",
          guide: "마지막 날은 아라시야마. 하늘을 가린 대나무길을 걷고, 도게츠교 다리에서 강을 봤어. 바람에 댓잎 스치는 소리가 그렇게 좋더라.",
          reaction: "쉬이익— 대나무가 노래해! 여기서 여행 끝내기 딱이다… 또 오자 🎋",
          photos: [p("대나무 터널 길", "3/4", "sage"), p("도게츠교 다리", "16/10", "cool"), p("강가 풍경", "4/3", "sage")]
        }
      ]
    }
  ]
};

// mutable data store — trips/spots are added at runtime (App bumps a version to re-render)
export const HP_DATA = {
  regions: {
    domestic: { key: "domestic", label: "국내", trips: [busan] },
    intl: { key: "intl", label: "국외", trips: [kansai] }
  }
};

// flatten ordered spots for a trip (with day context)
export function ordered(trip) {
  const out = [];
  trip.days.forEach((d) => {
    d.spots.forEach((s) => { out.push({ dayLabel: d.label, dayDate: d.date, ...s }); });
  });
  return out;
}

// ---- auto character lines (simple: time-of-day + random template) ----
export function autoLine(opts) {
  const hour = parseInt(((opts && opts.time) || "12:00").slice(0, 2), 10);
  const slot = hour < 11 ? "morning" : hour < 16 ? "day" : hour < 19 ? "evening" : "night";
  const B = {
    morning: ["아침부터 부지런하네! 여기서 하루를 열었지.", "이른 시간이라 한적했어. 공기 좋더라."],
    day: ["한낮의 이곳, 활기가 가득했지.", "여기 풍경 기억나? 한참 머물렀잖아."],
    evening: ["해질 무렵이라 빛이 참 예뻤어.", "노을 시간에 도착했네. 분위기 최고였지."],
    night: ["밤의 이곳, 불빛이 근사했어.", "저녁 늦게 들른 곳이야. 야경 좋았지."]
  }[slot];
  const N = {
    morning: ["상쾌해~ 여기 좋아!", "아침 공기 좋다아 ☀️"],
    day: ["우와 여기 진짜 좋다!", "사진 더 찍을걸 그랬나 ㅎㅎ"],
    evening: ["노을 봐봐… 예쁘다 🧡", "이 시간 풍경 최고야!"],
    night: ["반짝반짝하다…✨", "밤이라 더 분위기 있어!"]
  }[slot];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return { guide: pick(B), reaction: pick(N) };
}

// ---- Inbox: unsorted photos awaiting placement ----
function P(id, kind, date, time, lat, lng, tint, autoLabel, blur) {
  return { id, kind, date, time, lat, lng, tint, autoLabel, blur: !!blur };
}
export const INITIAL_INBOX = [
  P("i1", "unsorted", "2025-10-13", "19:10", 35.1530, 129.1180, "cool", "광안대교 불빛"),
  P("i2", "unsorted", "2025-10-13", "20:05", 35.1535, 129.1190, "warm", "해변 카페 야경"),
  P("i3", "unsorted", "2025-10-12", "11:20", 35.0976, 129.0110, "warm", "감천 골목 벽화"),
  P("i4", "unsorted", "2025-10-11", "12:35", 35.1585, 129.1600, "cool", "해운대 백사장"),
  P("i5", "unsorted", "2025-05-03", "20:30", 34.6688, 135.5015, "warm", "도톤보리 네온"),
  P("i6", "unsorted", "2025-05-05", "10:15", 34.9669, 135.7725, "gold", "후시미 토리이 터널"),
  P("i7", "unsorted", "2025-05-06", "16:40", 35.0096, 135.6740, "sage", "아라시야마 대숲"),
  P("i8", "unsorted", "2025-05-06", "11:30", 34.9951, 135.7852, "sage", "기요미즈 무대 조망"),
  P("i9", "noloc", "2025-10-12", "14:05", null, null, "cool", "바다 보이는 골목"),
  P("i10", "noloc", "2025-10-13", "10:20", null, null, "warm", "아침 산책"),
  P("i11", "noloc", "2025-05-04", "18:40", null, null, "gold", "쿠시카츠 한 접시"),
  P("i12", "noloc", "2025-05-07", "09:10", null, null, "sage", "마지막 날 강가"),
  P("i13", "blurry", "2025-10-11", "13:00", 35.1580, 129.1590, "cool", "흔들린 바다 사진", true),
  P("i14", "blurry", "2025-05-05", "12:00", null, null, "warm", "초점 나간 컷", true),
  P("i15", "blurry", "2025-05-03", "21:00", 34.6690, 135.5010, "warm", "네온 잔상", true),
  P("i16", "blurry", "2025-10-12", "16:30", 35.0970, 129.0300, "sage", "움직이는 시장", true)
];

function hav(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// auto-suggest Trip / Day / Spot from a photo's date + GIS
export function suggest(item) {
  const ym = item.date.slice(0, 7);
  let trip = null;
  ["domestic", "intl"].forEach((rk) => {
    HP_DATA.regions[rk].trips.forEach((t) => {
      if (t.start && t.start.slice(0, 7) === ym) trip = t;
    });
  });
  if (!trip) return null;
  const res = { tripId: trip.id, tripTitle: trip.title, spots: ordered(trip) };
  const mm = item.date.slice(5, 7), dd = item.date.slice(8, 10);
  const day = trip.days.find((d) => {
    const m = d.date.match(/(\d+)\.(\d+)/);
    return m && String(m[1]).padStart(2, "0") === mm && String(m[2]).padStart(2, "0") === dd;
  });
  if (day) res.dayLabel = day.label;
  if (item.lat != null) {
    let best = null, bd = 1e9;
    const pool = day ? day.spots : trip.days.reduce((a, d) => a.concat(d.spots), []);
    pool.forEach((s) => { const dist = hav(item.lat, item.lng, s.lat, s.lng); if (dist < bd) { bd = dist; best = s; } });
    if (best) {
      res.spotId = best.id; res.spotName = best.name; res.distM = Math.round(bd * 1000);
      if (!res.dayLabel) trip.days.forEach((d) => { if (d.spots.some((s) => s.id === best.id)) res.dayLabel = d.label; });
    }
  }
  return res;
}
