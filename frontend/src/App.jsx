import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Heart, Menu, Search, ShoppingBag, Sparkles, X } from 'lucide-react'

const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const categoryCopy = { Shoes: 'Made to move with you.', Clothing: 'Everyday pieces, considered.', Accessories: 'The finishing touches.' }

async function requestJson(url, options) {
  const response = await fetch(url, options)
  const body = await response.text()
  let data
  try { data = body ? JSON.parse(body) : null } catch { throw Error(`API returned HTML/text (HTTP ${response.status}) from ${response.url}. Check FastAPI at http://127.0.0.1:8000/api/catalog; response starts: ${body.slice(0, 100).replace(/\s+/g, ' ')}`) }
  if (!response.ok) throw Error(data?.detail || `API request failed (${response.status}).`)
  if (!data) throw Error('API returned an empty response.')
  return data
}

function App() {
  const [catalog, setCatalog] = useState({ products: [], featured: [], categories: [] })
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi, I'm your AnyCart assistant. Looking for something in particular?" }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const chatEnd = useRef(null)

  useEffect(() => { requestJson(`${api}/api/catalog`).then(setCatalog).catch(e => setError(e.message)) }, [])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const items = (category === 'All' ? catalog.products : catalog.products.filter(p => p.category === category))
    .filter(p => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(query.toLowerCase()))
  const submit = async (event, suggestion) => {
    event?.preventDefault()
    const text = (suggestion ?? input).trim()
    if (!text || sending) return
    setMessages(current => [...current, { role: 'user', content: text }]); setInput(''); setSending(true); setError('')
    try {
      const data = await requestJson(`${api}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })
      setMessages(current => [...current, { role: 'assistant', content: data.response }])
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reach the assistant.') }
    finally { setSending(false) }
  }

  return <div className="min-h-screen bg-paper text-ink">
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <a href="#top" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-accent"><ShoppingBag size={18}/></span>anycart<span className="text-accent">.</span></a>
        <nav className="hidden items-center gap-9 text-sm font-medium md:flex"><a href="#shop" className="hover:text-muted">Shop</a><a href="#featured" className="hover:text-muted">Featured</a><a href="#about" className="hover:text-muted">Our approach</a></nav>
        <div className="flex items-center gap-2"><button onClick={() => setChatOpen(true)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest"><Sparkles size={15} className="text-accent"/><span className="hidden sm:inline">Ask AnyCart</span><span className="sm:hidden">Ask AI</span></button><button className="grid h-10 w-10 place-items-center rounded-full border border-black/10 md:hidden" onClick={() => document.querySelector('#shop')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Shop"><Menu size={18}/></button></div>
      </div>
    </header>

    <main id="top" className="mx-auto max-w-[1440px] px-5 md:px-10">
      <section className="relative mb-14 mt-7 min-h-[440px] overflow-hidden rounded-[28px] bg-[#263a31] text-white md:mb-20 md:mt-9 md:min-h-[510px]">
        <img className="absolute inset-0 h-full w-full object-cover opacity-65" src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2000&q=85" alt="Sunlit, thoughtfully curated boutique" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#17241e]/95 via-[#1b2922]/65 to-transparent" />
        <div className="relative flex min-h-[440px] max-w-2xl flex-col justify-center px-7 py-12 md:min-h-[510px] md:px-16">
          <span className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[.16em]"><span className="h-1.5 w-1.5 rounded-full bg-accent"/>Thoughtful finds, every day</span>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-.055em] md:text-7xl">Good things,<br/>found <span className="font-serif italic font-normal text-accent">together.</span></h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-white/75 md:text-base">A little more personal. Find pieces you’ll love, and let a smarter shopping assistant help along the way.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3"><a href="#shop" className="flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-ink transition hover:bg-white">Explore the collection <ArrowDown size={15}/></a><button onClick={() => setChatOpen(true)} className="flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"><Sparkles size={15}/>Meet your assistant</button></div>
        </div>
        <div className="absolute bottom-7 right-8 hidden items-center gap-2 text-xs text-white/70 md:flex"><span className="h-px w-8 bg-accent"/>Curated for everyday living</div>
      </section>

      <section id="shop" className="mb-20 scroll-mt-28">
        <div className="mb-7 flex flex-col justify-between gap-5 md:mb-9 md:flex-row md:items-end"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-muted">A good place to start</p><h2 className="text-3xl font-semibold tracking-[-.04em] md:text-4xl">Find your kind of thing</h2></div><div className="relative w-full md:max-w-[280px]"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the collection" className="w-full rounded-full border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-ink"/></div></div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1">{['All', ...catalog.categories].map(c => <button key={c} onClick={() => setCategory(c)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${category === c ? 'bg-ink text-white' : 'border border-black/10 bg-white text-muted hover:border-ink hover:text-ink'}`}>{c === 'All' ? 'Everything' : c}</button>)}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{catalog.categories.map((c, i) => {
          const imageByCategory = { Accessories: 'photo-1523275335684-37898b6baf30', Clothing: 'photo-1483985988355-763728e1935b', Shoes: 'photo-1542291026-7eec264c27ff' }
          const count = catalog.products.filter(p => p.category === c).length
          return <button key={c} onClick={() => { setCategory(c); document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' }) }} className={`group relative h-[220px] overflow-hidden rounded-2xl text-left text-white sm:h-[260px] ${i === 0 ? 'sm:col-span-2 lg:col-span-1 lg:h-[300px]' : ''}`}><img src={`https://images.unsplash.com/${imageByCategory[c]}?auto=format&fit=crop&w=900&q=80`} alt={c} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent"/><div className="absolute bottom-5 left-5 right-5 flex items-end justify-between"><div><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/75">{count} pieces</span><h3 className="mt-1 text-2xl font-semibold tracking-tight">{c}</h3><p className="mt-1 text-xs text-white/75">{categoryCopy[c]}</p></div><span className="grid h-9 w-9 place-items-center rounded-full border border-white/50 transition group-hover:bg-accent group-hover:text-ink"><ArrowRight size={16}/></span></div></button>
        })}</div>
      </section>

      <section id="featured" className="mb-24 scroll-mt-28">
        <div className="mb-8 flex items-end justify-between"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-muted">Picked with care</p><h2 className="text-3xl font-semibold tracking-[-.04em] md:text-4xl">A few good picks</h2></div><span className="hidden text-sm text-muted sm:block">Good design. Everyday ease.</span></div>
        {error && catalog.products.length === 0 ? <div className="rounded-2xl border border-amber-900/10 bg-amber-50 p-5 text-sm text-amber-900">{error}<p className="mt-2 text-xs">Start the backend with <code>uv run uvicorn api:app --reload</code>.</p></div> : <div id="products" className="grid scroll-mt-28 grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">{items.map((p, i) => <article key={p.product_id} className="group"><div className={`relative mb-4 flex h-[280px] items-center justify-center overflow-hidden rounded-2xl ${['bg-[#e9e5dc]', 'bg-[#e6e8df]', 'bg-[#e9e2dc]'][i % 3]}`}><ProductArtwork product={p}/><span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink">{p.category}</span><button aria-label={`Ask about ${p.name}`} onClick={() => { setChatOpen(true); setInput(`Tell me about ${p.name}`) }} className="absolute bottom-4 right-4 grid h-10 w-10 translate-y-3 place-items-center rounded-full bg-white text-ink opacity-0 shadow transition group-hover:translate-y-0 group-hover:opacity-100"><Heart size={17}/></button></div><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold tracking-tight">{p.name}</h3><p className="mt-1 text-xs text-muted">{p.description}</p><p className="mt-2 font-mono text-[10px] text-muted/75">#{p.product_id} · {p.inventory} in stock</p></div><span className="shrink-0 font-semibold">${p.price.toFixed(2)}</span></div></article>)}</div>}
      </section>

      <section id="about" className="mb-10 overflow-hidden rounded-[26px] bg-[#e8ebdd] px-7 py-10 md:flex md:items-center md:justify-between md:px-12 md:py-12"><div className="max-w-xl"><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em]"><Sparkles size={12}/>Shopping, made simpler</span><h2 className="text-3xl font-semibold leading-tight tracking-[-.04em] md:text-4xl">A helpful human touch,<br/>powered by a little AI.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-muted">Need a recommendation, want to place an order, or checking where yours is? Just ask. AnyCart’s assistant is ready when you are.</p></div><button onClick={() => setChatOpen(true)} className="mt-7 flex shrink-0 items-center gap-3 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-forest md:mt-0"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-ink"><Sparkles size={14}/></span>Chat with AnyCart<ArrowRight size={15}/></button></section>
      <footer className="flex flex-col justify-between gap-3 border-t border-black/10 py-7 text-xs text-muted sm:flex-row sm:items-center"><a href="#top" className="text-sm font-extrabold tracking-tight text-ink">anycart<span className="text-[#8ca638]">.</span></a><span>Thoughtfully picked. Happily found.</span><span>Powered by Amazon Bedrock</span></footer>
    </main>

    <button onClick={() => setChatOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-black/15 transition hover:scale-[1.03] md:bottom-8 md:right-8"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-ink"><Sparkles size={15}/></span><span>Ask AnyCart</span></button>
    {chatOpen && <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onMouseDown={e => { if (e.target === e.currentTarget) setChatOpen(false) }}><aside className="flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-black/5 px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-ink text-accent"><Sparkles size={18}/></div><div><p className="font-semibold">AnyCart assistant</p><p className="flex items-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Here to help you find it</p></div></div><button aria-label="Close assistant" onClick={() => setChatOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-paper"><X size={17}/></button></header>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfbf9] p-5">{messages.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'user' ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md border border-black/5 bg-white text-ink'}`}>{m.content}</div></div>)}{sending && <div className="flex"><div className="rounded-2xl rounded-bl-md border border-black/5 bg-white px-4 py-3 text-sm text-muted">Thinking…</div></div>}<div ref={chatEnd}/></div>
      <div className="border-t border-black/5 p-4">{messages.length === 1 && <div className="mb-3 flex flex-wrap gap-2">{['Find me running shoes', 'How do I track an order?'].map(s => <button key={s} onClick={() => submit(undefined, s)} className="rounded-full border border-black/10 px-3 py-2 text-xs text-muted transition hover:border-ink hover:text-ink">{s}</button>)}</div>}{error && catalog.products.length > 0 && <p className="mb-2 text-xs text-red-600">{error}</p>}<form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 pl-4 focus-within:border-ink"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask for a recommendation…" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"/><button disabled={sending || !input.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-white transition hover:bg-forest disabled:opacity-40"><ArrowUp size={18}/></button></form><p className="mt-2 text-center text-[10px] text-muted">Recommendations, orders and order tracking</p></div>
    </aside></div>}
  </div>
}

function ProductArtwork({ product }) {
  const shoe = product.category === 'Shoes'
  const bag = product.name.toLowerCase().includes('bag')
  const watch = product.name.toLowerCase().includes('watch')
  const clothing = product.category === 'Clothing'
  return <div className="relative flex h-full w-full items-center justify-center transition duration-500 group-hover:scale-105">{shoe ? <svg viewBox="0 0 320 220" className="h-[76%] w-[82%] drop-shadow-[0_24px_18px_rgba(0,0,0,.14)]" aria-label={product.name}><path d="M50 134c25-4 41-27 49-63 3-13 17-12 23 0l22 42c10 17 40 23 71 25 31 2 46 13 54 30l-1 16H57c-17 0-23-9-20-22 2-12 5-22 13-28Z" fill={product.name.includes('Boots') ? '#706650' : '#f7f7f3'} stroke="#313a35" strokeWidth="6" strokeLinejoin="round"/><path d="M121 98c27 4 38 13 50 27M109 111c24 4 39 13 50 27M95 123c21 4 36 12 48 25" fill="none" stroke="#6b756e" strokeWidth="5" strokeLinecap="round"/><path d="M43 163c49 7 115 6 221 1" fill="none" stroke="#aab176" strokeWidth="5" strokeLinecap="round"/></svg> : watch ? <div className="flex items-center"><div className="h-28 w-10 rounded-full bg-[#68736b]"/><div className="relative z-10 grid h-32 w-32 place-items-center rounded-[32px] border-[8px] border-[#bcc1b6] bg-[#333b36] shadow-xl"><div className="grid h-24 w-24 place-items-center rounded-full border border-white/30 text-center text-xs text-white/80"><span>10:10<br/><span className="text-[8px] text-accent">MONDAY</span></span></div></div><div className="-ml-2 h-28 w-10 rounded-full bg-[#68736b]"/></div> : bag ? <svg viewBox="0 0 220 240" className="h-[75%] drop-shadow-[0_24px_18px_rgba(0,0,0,.12)]" aria-label={product.name}><path d="M54 90h112l14 112H40L54 90Z" fill="#9b795f" stroke="#544334" strokeWidth="5"/><path d="M75 94c0-47 71-47 71 0" fill="none" stroke="#544334" strokeWidth="9"/><path d="M110 110v55" stroke="#d8c2a9" strokeWidth="3"/></svg> : clothing ? <svg viewBox="0 0 240 240" className="h-[78%] drop-shadow-[0_24px_18px_rgba(0,0,0,.12)]" aria-label={product.name}><path d="m78 37 31 16h23l31-16 46 39-29 37-18-15v112H78V98l-18 15-29-37 47-39Z" fill={product.name.includes('Coat') ? '#898276' : product.name.includes('Jeans') ? '#596d82' : '#a3ad91'} stroke="#555e52" strokeWidth="5" strokeLinejoin="round"/><path d="M109 53 96 85l24 22 24-22-12-32M120 107v102" fill="none" stroke="#e1e1d6" strokeWidth="3"/></svg> : <svg viewBox="0 0 240 240" className="h-[70%] drop-shadow-[0_24px_18px_rgba(0,0,0,.12)]" aria-label={product.name}><circle cx="120" cy="120" r="67" fill="#b9a789"/><path d="M63 124c27-27 84-27 114 0M78 80c23 14 59 14 84 0" fill="none" stroke="#766651" strokeWidth="6" strokeLinecap="round"/><circle cx="120" cy="120" r="9" fill="#f4f0e8"/></svg>}</div>
}

export default App
