import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Calendar as CalendarIcon,
  BarChart3,
  Settings,
  Upload,
  Plus,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const PLATFORM_META = {
  youtube: { label: "YouTube", color: "#C1554C", note: "Real API scheduling — quota-limited" },
  instagram: { label: "Instagram", color: "#D9A441", note: "Needs Business account + Facebook Page" },
  tiktok: { label: "TikTok", color: "#4C8C8C", note: "Private-only until TikTok audits your app" },
  facebook: { label: "Facebook", color: "#7A93AC", note: "Your own Pages skip app review" },
};

function pad(n) {
  return String(n).padStart(2, "0");
}
function isoDate(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function monthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Dailies() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("calendar");
  const [channels, setChannels] = useState({
    youtube: [], instagram: [], facebook: [], tiktok: []
  });
  const [library, setLibrary] = useState([]);
  const [posts, setPosts] = useState([]);
  const [toast, setToast] = useState(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const fileInputRef = useRef(null);

  const fetchChannels = async () => {
    try {
      const channelsRes = await fetch(`${API_URL}/channels`).then(r => r.json());
      setChannels(channelsRes);
    } catch (e) {
      console.error("Failed to fetch channels", e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchChannels();
        const postsRes = await fetch(`${API_URL}/posts`).then(r => r.json());
        setPosts(postsRes);
      } catch (e) {
        console.error("Failed to load data", e);
      }
      setReady(true);
    })();

    // Auto-refresh channels when the user returns to the tab (e.g. from OAuth)
    const onFocus = () => fetchChannels();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const todayISO = (() => {
    const n = new Date();
    return isoDate(n.getFullYear(), n.getMonth(), n.getDate());
  })();

  function openNewPostModal(dateStr) {
    setDraft({
      id: uid(),
      title: "",
      caption: "",
      libraryItemId: "",
      date: dateStr || todayISO,
      time: "09:00",
      selections: [],
      status: "scheduled",
      thumbnailFile: null,
      tags: "",
      madeForKids: false,
      categoryId: "22",
    });
    setModalOpen(true);
  }

  function toggleSelection(platform, index) {
    setDraft((d) => {
      // index is actually the channel object index
      const channelId = channels[platform][index]?.id;
      const key = `${platform}:${channelId}`;
      const exists = d.selections.includes(key);
      return {
        ...d,
        selections: exists
          ? d.selections.filter((s) => s !== key)
          : [...d.selections, key],
      };
    });
  }

  async function saveDraft() {
    if (!draft.title.trim() || draft.selections.length === 0) {
      setToast({ kind: "error", text: "Add a title and pick at least one channel." });
      return;
    }

    const libItem = library.find(l => l.id === draft.libraryItemId);
    if (!libItem || !libItem.file) {
      setToast({ kind: "error", text: "Please attach a video from the library." });
      return;
    }

    // Grab the first selected channel
    const firstSelection = draft.selections[0];
    const channelId = firstSelection.split(':')[1];

    const formData = new FormData();
    formData.append("title", draft.title);
    formData.append("caption", draft.caption);
    formData.append("date", draft.date);
    formData.append("time", draft.time);
    formData.append("channelId", channelId);
    formData.append("video", libItem.file);
    formData.append("tags", draft.tags);
    formData.append("madeForKids", draft.madeForKids);
    formData.append("categoryId", draft.categoryId);
    if (draft.thumbnailFile) {
      formData.append("thumbnail", draft.thumbnailFile);
    }

    try {
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts((p) => [...p, {
          ...draft, 
          id: newPost.id, 
          status: newPost.status
        }]);
        setModalOpen(false);
        setToast({ kind: "ok", text: "Post scheduled." });
      } else {
        setToast({ kind: "error", text: "Failed to schedule post." });
      }
    } catch(e) {
      setToast({ kind: "error", text: "API error." });
    }
  }

  async function deletePost(id) {
    try {
      await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
      setPosts((p) => p.filter((x) => x.id !== id));
      setToast({ kind: "ok", text: "Removed from calendar." });
    } catch(e) {
      setToast({ kind: "error", text: "Failed to delete." });
    }
  }

  function handleFilePicked(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const items = files.map((f) => ({
      id: uid(),
      name: f.name,
      mediaType: f.type.startsWith("video") ? "video" : "photo",
      addedAt: new Date().toISOString(),
      previewUrl: URL.createObjectURL(f),
      file: f
    }));
    setLibrary((lib) => [...items, ...lib]);
    setToast({ kind: "ok", text: `Added ${items.length} item${items.length > 1 ? "s" : ""} to the library.` });
    e.target.value = "";
  }

  async function renameChannel(platform, index, value, id) {
    const newChannels = { ...channels, [platform]: [...channels[platform]] };
    newChannels[platform][index].name = value;
    setChannels(newChannels);

    try {
      await fetch(`${API_URL}/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value })
      });
    } catch (e) {
      console.error(e);
    }
  }

  const grid = monthGrid(viewDate.year, viewDate.month);
  const postsByDate = posts.reduce((acc, p) => {
    (acc[p.date] = acc[p.date] || []).push(p);
    return acc;
  }, {});

  const analyticsData = Object.keys(PLATFORM_META).map((key) => {
    const count = posts.filter((p) =>
      p.selections.some((s) => s.startsWith(key + ":"))
    ).length;
    return { platform: PLATFORM_META[key].label, scheduled: count, fill: PLATFORM_META[key].color };
  });

  const totalChannels = Object.values(channels).reduce((n, arr) => n + arr.length, 0);

  if (!ready) {
    return (
      <div style={styles.root}>
        <style>{cssVars}</style>
        <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading dailies…</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <style>{cssVars}</style>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.brand}>
          <Film size={20} color="var(--amber)" />
          <div>
            <div style={styles.brandTitle}>DAILIES</div>
            <div style={styles.brandSub}>{totalChannels} channels connected</div>
          </div>
        </div>
        <nav style={styles.nav}>
          <NavItem icon={<Upload size={16} />} label="Library" active={tab === "library"} onClick={() => setTab("library")} />
          <NavItem icon={<CalendarIcon size={16} />} label="Calendar" active={tab === "calendar"} onClick={() => setTab("calendar")} />
          <NavItem icon={<BarChart3 size={16} />} label="Analytics" active={tab === "analytics"} onClick={() => setTab("analytics")} />
          <NavItem icon={<Settings size={16} />} label="Channels" active={tab === "channels"} onClick={() => setTab("channels")} />
        </nav>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {tab === "library" && (
          <LibraryTab
            library={library}
            fileInputRef={fileInputRef}
            handleFilePicked={handleFilePicked}
            onSchedule={(item) => {
              openNewPostModal(null);
              setTimeout(() => setDraft((d) => ({ ...d, libraryItemId: item.id, title: d.title || item.name })), 0);
            }}
            onDelete={(id) => setLibrary((l) => l.filter((x) => x.id !== id))}
          />
        )}

        {tab === "calendar" && (
          <CalendarTab
            viewDate={viewDate}
            setViewDate={setViewDate}
            grid={grid}
            postsByDate={postsByDate}
            todayISO={todayISO}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            openNewPostModal={openNewPostModal}
            deletePost={deletePost}
          />
        )}

        {tab === "analytics" && <AnalyticsTab data={analyticsData} posts={posts} library={library} totalChannels={totalChannels} />}

        {tab === "channels" && <ChannelsTab channels={channels} renameChannel={renameChannel} />}
      </div>

      {modalOpen && draft && (
        <NewPostModal
          draft={draft}
          setDraft={setDraft}
          channels={channels}
          library={library}
          toggleSelection={toggleSelection}
          onCancel={() => setModalOpen(false)}
          onSave={saveDraft}
        />
      )}

      {toast && (
        <div style={{ ...styles.toast, borderColor: toast.kind === "error" ? "var(--danger)" : "var(--teal)" }}>
          {toast.kind === "error" ? <X size={14} color="var(--danger)" /> : <Check size={14} color="var(--teal)" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function LibraryTab({ library, fileInputRef, handleFilePicked, onSchedule, onDelete }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.h2}>Library</h2>
          <div style={styles.subtext}>Raw footage and stills, ready to schedule.</div>
        </div>
        <button style={styles.primaryBtn} onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} /> Upload
        </button>
        <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFilePicked} />
      </div>

      {library.length === 0 ? (
        <div style={styles.emptyState}>
          <Film size={28} color="var(--text-muted)" />
          <div>Nothing in the library yet. Upload a clip to get started.</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {library.map((item) => (
            <div key={item.id} style={styles.card}>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle} title={item.name}>{item.name}</div>
                <div style={{display: 'flex', gap: 10, marginTop: 10}}>
                  <button style={styles.smallBtn} onClick={() => onSchedule(item)}>Schedule</button>
                  <button style={styles.smallBtnGhost} onClick={() => onDelete(item.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarTab({ viewDate, setViewDate, grid, postsByDate, todayISO, selectedDay, setSelectedDay, openNewPostModal, deletePost }) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function shiftMonth(delta) {
    let { year, month } = viewDate;
    month += delta;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    setViewDate({ year, month });
    setSelectedDay(null);
  }
  const selectedISO = selectedDay ? isoDate(viewDate.year, viewDate.month, selectedDay) : null;
  const dayPosts = selectedISO ? postsByDate[selectedISO] || [] : [];

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.h2}>{MONTH_NAMES[viewDate.month]} {viewDate.year}</h2>
          <div style={styles.subtext}>Tap a day to see or add scheduled posts.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.iconBtn} onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
          <button style={styles.iconBtn} onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
          <button style={styles.primaryBtn} onClick={() => openNewPostModal(selectedISO)}>
            <Plus size={15} /> New post
          </button>
        </div>
      </div>

      <div style={styles.calendarGrid}>
        {dayNames.map((d) => (
          <div key={d} style={styles.dayName}>{d}</div>
        ))}
        {grid.map((day, i) => {
          if (!day) return <div key={i} style={styles.dayCellEmpty} />;
          const iso = isoDate(viewDate.year, viewDate.month, day);
          const dayItems = postsByDate[iso] || [];
          const isToday = iso === todayISO;
          const isSelected = day === selectedDay;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(day)}
              style={{
                ...styles.dayCell,
                ...(isToday ? styles.dayCellToday : {}),
                ...(isSelected ? styles.dayCellSelected : {}),
              }}
            >
              <span style={styles.dayNum}>{day}</span>
              <div style={styles.dotRow}>
                {dayItems.slice(0, 4).map((p, idx) => {
                  const firstPlatform = p.selections[0]?.split(":")[0];
                  const color = PLATFORM_META[firstPlatform]?.color || "var(--text-muted)";
                  return <span key={idx} style={{ ...styles.dot, background: color }} />;
                })}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div style={styles.dayPanel}>
          <div style={styles.dayPanelHeader}>
            {MONTH_NAMES[viewDate.month]} {selectedDay}, {viewDate.year}
          </div>
          {dayPosts.length === 0 ? (
            <div style={styles.subtext}>Nothing scheduled. Use “New post” above to add one.</div>
          ) : (
            dayPosts.map((p) => (
              <div key={p.id} style={styles.postRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.postTitle}>{p.title}</div>
                  <div style={styles.postMeta}>
                    <Clock size={12} /> {p.time} · Status: {p.status}
                  </div>
                </div>
                <button style={styles.smallBtnGhost} onClick={() => deletePost(p.id)}><Trash2 size={14} /></button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ data, posts, library, totalChannels }) {
  return (
    <div style={styles.panel}>
      <h2 style={styles.h2}>Analytics</h2>
      <div style={styles.statsRow}>
        <StatCard label="In library" value={library.length} />
        <StatCard label="Posts scheduled" value={posts.length} />
        <StatCard label="Channels connected" value={totalChannels} />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function ChannelsTab({ channels, renameChannel }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.h2}>Channels</h2>
          <div style={styles.subtext}>Connect and rename your real accounts.</div>
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <a 
          href={`${API_URL}/auth/youtube`} 
          target="_blank" 
          rel="noreferrer"
          style={{ ...styles.primaryBtn, background: PLATFORM_META.youtube.color, color: 'white' }}
        >
          Authorize YouTube
        </a>
        <a 
          href={`${API_URL}/auth/tiktok`} 
          target="_blank" 
          rel="noreferrer"
          style={{ ...styles.primaryBtn, background: PLATFORM_META.tiktok.color, color: 'white' }}
        >
          Authorize TikTok
        </a>
        <a 
          href={`${API_URL}/auth/facebook`} 
          target="_blank" 
          rel="noreferrer"
          style={{ ...styles.primaryBtn, background: PLATFORM_META.facebook.color, color: 'white' }}
        >
          Connect Facebook & IG
        </a>
      </div>

      {Object.keys(PLATFORM_META).map((platform) => (
        <div key={platform} style={styles.channelGroup}>
          <div style={styles.channelGroupHeader}>
            <span style={{ ...styles.platformDot, background: PLATFORM_META[platform].color }} />
            <span style={styles.cardTitle}>{PLATFORM_META[platform].label}</span>
          </div>
          <div style={styles.channelList}>
            {channels[platform]?.map((c, i) => (
              <input
                key={c.id}
                value={c.name}
                onChange={(e) => renameChannel(platform, i, e.target.value, c.id)}
                style={styles.channelInput}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewPostModal({ draft, setDraft, channels, library, toggleSelection, onCancel, onSave }) {
  return (
    <div style={styles.modalScrim}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={styles.cardTitle}>New post</div>
          <button style={styles.smallBtnGhost} onClick={onCancel}><X size={16} /></button>
        </div>

        <div style={styles.modalBody}>
          <label style={styles.label}>Title</label>
          <input
            style={styles.input}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. Golden hour rooftop session"
          />

          <label style={styles.label}>Attach from library</label>
          <select
            style={styles.input}
            value={draft.libraryItemId}
            onChange={(e) => setDraft({ ...draft, libraryItemId: e.target.value })}
          >
            <option value="">None</option>
            {library.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>

          <label style={styles.label}>Custom Thumbnail (Optional)</label>
          <input
            type="file"
            accept="image/*"
            style={{ ...styles.input, padding: 5 }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setDraft({ ...draft, thumbnailFile: e.target.files[0] });
              }
            }}
          />

          <label style={styles.label}>Caption</label>
          <textarea
            style={{ ...styles.input, minHeight: 70 }}
            value={draft.caption}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
            placeholder="Write a caption…"
          />

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Date</label>
              <input type="date" style={styles.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Time</label>
              <input type="time" style={styles.input} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            </div>
          </div>

          <label style={styles.label}>Tags (comma separated)</label>
          <input
            style={styles.input}
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
            placeholder="gaming, funny, stream"
          />

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Category</label>
              <select style={styles.input} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                <option value="1">Film & Animation</option>
                <option value="2">Autos & Vehicles</option>
                <option value="10">Music</option>
                <option value="15">Pets & Animals</option>
                <option value="17">Sports</option>
                <option value="20">Gaming</option>
                <option value="22">People & Blogs</option>
                <option value="23">Comedy</option>
                <option value="24">Entertainment</option>
                <option value="27">Education</option>
                <option value="28">Science & Technology</option>
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "white", padding: 10, cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={draft.madeForKids}
                  onChange={(e) => setDraft({ ...draft, madeForKids: e.target.checked })} 
                />
                Made for Kids
              </label>
            </div>
          </div>

          <label style={styles.label}>Channels</label>
          {Object.keys(PLATFORM_META).map((platform) => (
            <div key={platform} style={{ marginBottom: 10 }}>
              <div style={{ ...styles.subtext, marginBottom: 6 }}>{PLATFORM_META[platform].label}</div>
              <div style={styles.chipPickerRow}>
                {channels[platform]?.map((c, i) => {
                  const key = `${platform}:${c.id}`;
                  const selected = draft.selections.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSelection(platform, i)}
                      style={{
                        ...styles.pickChip,
                        borderColor: selected ? PLATFORM_META[platform].color : "var(--border)",
                        background: selected ? PLATFORM_META[platform].color + "22" : "transparent",
                        color: selected ? PLATFORM_META[platform].color : "var(--text-muted)",
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.smallBtnGhost} onClick={onCancel}>Cancel</button>
          <button style={styles.primaryBtn} onClick={onSave}><Check size={15} /> Save to calendar</button>
        </div>
      </div>
    </div>
  );
}

const cssVars = `
  * { box-sizing: border-box; }
  button { font-family: inherit; cursor: pointer; }
  input, textarea, select { font-family: inherit; }
  :root { --amber: #D9A441; --text-muted: #9C9282; --danger: #C1554C; --teal: #4C8C8C; --border: #2A261F; }
`;

const styles = {
  root: { display: "flex", minHeight: 700, background: "#14110D", color: "#F2EDE4", fontFamily: "sans-serif", borderRadius: 12, border: "1px solid #2A261F" },
  sidebar: { width: 220, background: "#1A1712", borderRight: "1px solid #2A261F", padding: 10 },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: 20 },
  brandTitle: { fontWeight: "bold" },
  nav: { display: "flex", flexDirection: "column", gap: 5 },
  navItem: { padding: 10, background: "transparent", color: "white", border: "none", textAlign: "left", display: "flex", gap: 10, borderRadius: 5 },
  navItemActive: { background: "#333" },
  main: { flex: 1, padding: 20 },
  panel: { display: "flex", flexDirection: "column", gap: 20 },
  panelHeader: { display: "flex", justifyContent: "space-between" },
  primaryBtn: { background: "var(--amber)", color: "#000", padding: "8px 16px", borderRadius: 8, border: "none", display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" },
  smallBtn: { background: "#333", color: "white", padding: 5, border: "none", borderRadius: 4 },
  smallBtnGhost: { background: "transparent", color: "white", padding: 5, border: "1px solid #333", borderRadius: 4 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 },
  dayCell: { padding: 20, background: "#222", border: "none", color: "white", borderRadius: 5 },
  dayCellEmpty: { padding: 20 },
  dayName: { textAlign: "center", color: "var(--text-muted)" },
  modalScrim: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#111", padding: 20, borderRadius: 10, width: 400, display: "flex", flexDirection: "column", gap: 15 },
  modalHeader: { display: "flex", justifyContent: "space-between" },
  input: { padding: 10, background: "#222", color: "white", border: "1px solid #333", borderRadius: 5, width: "100%" },
  label: { fontSize: 12, color: "var(--text-muted)" },
  chipPickerRow: { display: "flex", gap: 5, flexWrap: "wrap" },
  pickChip: { padding: "5px 10px", borderRadius: 15, border: "1px solid #333", background: "transparent", color: "white" },
  channelGroup: { marginBottom: 15 },
  channelInput: { padding: 5, background: "#222", color: "white", border: "1px solid #333", borderRadius: 3, marginBottom: 5, display: "block" },
  statsRow: { display: "flex", gap: 15 },
  statCard: { padding: 20, background: "#222", borderRadius: 10, flex: 1 },
  statValue: { fontSize: 24, fontWeight: "bold" },
  toast: { position: "fixed", bottom: 20, right: 20, background: "#222", padding: "10px 20px", borderRadius: 5, display: "flex", gap: 10, borderLeft: "4px solid var(--teal)" },
  dotRow: { display: "flex", gap: 3, marginTop: 5 },
  dot: { width: 6, height: 6, borderRadius: "50%" },
  postRow: { display: "flex", justifyContent: "space-between", background: "#222", padding: 10, borderRadius: 5, marginTop: 5 }
};
