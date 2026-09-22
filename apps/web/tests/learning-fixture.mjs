// Disposable, local-only learning data. No production imports or database writes.
export function createLearningFixture() {
  const classes = [
    {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Matematika VIII A",
      subject: "Matematika",
      description:
        "Belajar mengenali pola, memahami bilangan, dan menjelaskan alasan.",
      teacher_name: "Ratna Dewi",
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      name: "Bahasa Indonesia VIII A",
      subject: "Bahasa Indonesia",
      description:
        "Menemukan gagasan dan menyampaikan cerita dengan kata-kata sendiri.",
      teacher_name: "Ratna Dewi",
    },
  ].map((c) => ({
    ...c,
    is_archived: false,
    member_count: 1,
    created_at: "2026-09-16T00:00:00Z",
  }));
  const materials = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      class_id: classes[0].id,
      title: "Memahami pecahan dalam keseharian",
      content:
        "Pecahan adalah bagian dari keseluruhan.\n\nBayangkan satu roti dibagi menjadi empat bagian yang sama besar. Setiap bagian adalah satu per empat dari roti tersebut. Dua bagian berarti dua per empat, yang nilainya sama dengan satu per dua.\n\nPembilang menyatakan banyak bagian yang diambil. Penyebut menyatakan banyak bagian sama besar dalam satu keseluruhan.\n\nCoba pikirkan: jika ada delapan potong roti dan kamu mengambil dua, berapa bagian yang kamu ambil? Jelaskan dengan kata-katamu sendiri.",
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      class_id: classes[0].id,
      title: "Mengenal bilangan bulat",
      content:
        "Bilangan bulat meliputi bilangan negatif, nol, dan bilangan positif.\n\nSuhu lima derajat di bawah nol ditulis negatif lima. Ketika suhu naik tujuh derajat, suhu akhirnya menjadi dua derajat di atas nol.\n\nCoba jelaskan perubahan suhu tersebut menggunakan kata-katamu sendiri.",
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      class_id: classes[1].id,
      title: "Menemukan gagasan utama",
      content:
        "Gagasan utama adalah inti yang dibahas dalam sebuah paragraf. Kalimat lain membantu menjelaskan inti tersebut.\n\nBaca sebuah paragraf, lalu tanyakan: paragraf ini terutama membahas apa? Cobalah merangkumnya dalam satu kalimat.",
    },
  ].map((m) => ({ ...m, published: true, created_at: "2026-09-16T00:00:00Z" }));
  const progress = new Map();
  const empty = () => ({
    completed: false,
    bookmarked: false,
    completed_at: null,
  });
  const state = (user, id) => progress.get(`${user.id}:${id}`) || empty();
  const chatSessions = new Map();
  let chatSerial = 1;
  const sessionsFor = (user) => {
    let sessions = chatSessions.get(user.id);
    if (!sessions) {
      sessions = new Map();
      chatSessions.set(user.id, sessions);
    }
    return sessions;
  };
  const sessionSummary = (session) => ({
    id: session.id,
    title: session.title,
    subject_id: session.subject_id,
    subject_name: session.subject_id ? "Matematika" : null,
    started_at: session.started_at,
  });
  const tutorReply = (text) =>
    /pecahan/i.test(text)
      ? "Pecahan menunjukkan bagian dari satu keseluruhan. Misalnya, satu roti dibagi menjadi empat bagian sama besar. Satu bagian disebut satu per empat."
      : "Mari kita uraikan pertanyaanmu langkah demi langkah. Bagian mana yang ingin kamu pahami lebih dulu?";
  const metadata = (m) => ({
    id: m.id,
    class_id: m.class_id,
    title: m.title,
    published: m.published,
    created_at: m.created_at,
  });
  return (req, url, body, user, send) => {
    if (url.pathname.startsWith("/chat")) {
      if (user.role !== "student") {
        send(403, {});
        return true;
      }
      const sessions = sessionsFor(user);
      const parts = url.pathname.split("/").filter(Boolean);
      if (url.pathname === "/chat/sessions" && req.method === "GET") {
        send(
          200,
          [...sessions.values()]
            .sort((a, b) => b.started_at.localeCompare(a.started_at))
            .map(sessionSummary),
        );
      } else if (url.pathname === "/chat/message" && req.method === "POST") {
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text || text.length > 4_000) {
          send(422, {});
        } else {
          let session = body.session_id ? sessions.get(body.session_id) : undefined;
          if (body.session_id && !session) {
            send(404, {});
          } else {
            if (!session) {
              const now = new Date().toISOString();
              session = {
                id: `30000000-0000-4000-8000-${String(chatSerial++).padStart(12, "0")}`,
                title: text.slice(0, 64),
                subject_id: body.subject_id || null,
                started_at: now,
                turns: [],
                ended: false,
              };
              sessions.set(session.id, session);
            }
            const now = new Date().toISOString();
            const reply = tutorReply(text);
            session.turns.push({ role: "student", text, intent: "unknown", timestamp: now });
            session.turns.push({ role: "tutor", text: reply, intent: "tutoring", timestamp: new Date().toISOString() });
            send(200, {
              session_id: session.id,
              text: reply,
              intent: "tutoring",
              next_action: "respond",
              sources: [],
              latency_ms: 42,
              quiz_progress: null,
            });
          }
        }
      } else if (
        parts[1] === "sessions" &&
        parts[2] &&
        parts.length === 3 &&
        req.method === "GET"
      ) {
        const session = sessions.get(parts[2]);
        if (!session) send(404, {});
        else send(200, { ...sessionSummary(session), turns: session.turns });
      } else if (
        parts[1] === "sessions" &&
        parts[2] &&
        parts.length === 3 &&
        req.method === "DELETE"
      ) {
        if (!sessions.delete(parts[2])) send(404, {});
        else send(204);
      } else if (
        parts[1] === "sessions" &&
        parts[2] &&
        parts[3] === "end" &&
        req.method === "POST"
      ) {
        const session = sessions.get(parts[2]);
        if (!session) send(404, {});
        else {
          session.ended = true;
          send(204);
        }
      } else {
        send(404, {});
      }
      return true;
    }
    if (!url.pathname.startsWith("/classes")) return false;
    // Only the seeded teacher/student are members in this read/learn fixture.
    const member = user.id === "test-student" || user.id === "test-teacher";
    const detail = (c) => ({
      ...c,
      material_count: materials.filter((m) => m.class_id === c.id).length,
    });
    if (url.pathname === "/classes/student/materials" && req.method === "GET") {
      send(
        user.role === "student" ? 200 : 403,
        user.role !== "student"
          ? {}
          : !member
            ? []
            : materials.map((m) => ({
                ...metadata(m),
                class_name: classes.find((c) => c.id === m.class_id).name,
                subject: classes.find((c) => c.id === m.class_id).subject,
                progress: state(user, m.id),
              })),
      );
    } else if (url.pathname === "/classes" && req.method === "GET") {
      send(200, member ? classes.map(detail) : []);
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      const room = classes.find((c) => c.id === parts[1]);
      const material = materials.find(
        (m) => m.id === parts[3] && m.class_id === room?.id,
      );
      if (!member || !room) send(404, {});
      else if (parts.length === 2 && req.method === "GET")
        send(200, {
          ...detail(room),
          materials: materials
            .filter((m) => m.class_id === room.id)
            .map(metadata),
          members: [],
        });
      else if (
        parts.length === 4 &&
        parts[2] === "materials" &&
        material &&
        req.method === "GET"
      )
        send(200, { ...material, progress: state(user, material.id) });
      else if (
        parts.length === 5 &&
        parts[2] === "materials" &&
        parts[4] === "progress" &&
        material &&
        req.method === "PATCH"
      ) {
        if (user.role !== "student") send(403, {});
        else if (
          Object.entries(body).some(
            ([key, value]) =>
              !["completed", "bookmarked"].includes(key) ||
              typeof value !== "boolean",
          )
        )
          send(422, {});
        else {
          const previous = state(user, material.id);
          const next = {
            ...previous,
            ...body,
            completed_at:
              body.completed === false
                ? null
                : body.completed === true
                  ? previous.completed_at || new Date().toISOString()
                  : previous.completed_at,
          };
          progress.set(`${user.id}:${material.id}`, next);
          send(200, next);
        }
      } else send(404, {});
    }
    return true;
  };
}
