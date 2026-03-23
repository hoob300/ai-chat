'use client'

import { useState, useRef, useEffect } from 'react'

type Model = 'claude' | 'openai'
type Message = { role: 'user' | 'assistant'; content: string; model?: Model }

const MODEL_INFO = {
  claude: { label: 'Claude', color: 'bg-orange-500', textColor: 'text-orange-600', bg: 'bg-orange-50' },
  openai: { label: 'GPT-4o', color: 'bg-green-500', textColor: 'text-green-600', bg: 'bg-green-50' },
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState<Model>('claude')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMessage: Message = { role: 'assistant', content: '', model }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + text,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1].content = '응답을 가져오지 못했습니다.'
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME 조합 중(한국어 입력 등)에는 무시
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-green-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
            AI
          </div>
          <div>
            <h1 className="font-bold text-gray-900">AI Chat</h1>
            <p className="text-xs text-gray-500">Claude & GPT-4o</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['claude', 'openai'] as Model[]).map(m => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  model === m
                    ? `${MODEL_INFO[m].color} text-white shadow-sm`
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {MODEL_INFO[m].label}
              </button>
            ))}
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              초기화
            </button>
          )}
        </div>
      </header>

      {/* 메시지 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-green-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              AI
            </div>
            <div>
              <p className="font-bold text-gray-700 text-lg">무엇이든 물어보세요</p>
              <p className="text-sm text-gray-400 mt-1">
                현재 모델:{' '}
                <span className={`font-semibold ${MODEL_INFO[model].textColor}`}>
                  {MODEL_INFO[model].label}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 max-w-sm w-full">
              {['코드 작성해줘', '번역해줘', '요약해줘', '아이디어 제안해줘'].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-full flex-shrink-0 mr-2 mt-1 flex items-center justify-center text-white text-xs font-bold ${MODEL_INFO[msg.model || 'claude'].color}`}>
                  {msg.model === 'openai' ? 'G' : 'C'}
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : `${MODEL_INFO[msg.model || 'claude'].bg} text-gray-800 rounded-bl-sm`
              }`}>
                {msg.content || (loading && i === messages.length - 1
                  ? <span className="flex gap-1 items-center h-4">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  : ''
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </main>

      {/* 입력창 */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${MODEL_INFO[model].label}에게 메시지 보내기... (Enter: 전송, Shift+Enter: 줄바꿈)`}
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 max-h-40"
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 160) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              input.trim() && !loading
                ? `${MODEL_INFO[model].color} text-white hover:opacity-90`
                : 'bg-gray-100 text-gray-300'
            }`}
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
