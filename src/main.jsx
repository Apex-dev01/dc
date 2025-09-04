import React, { useState, useEffect, useRef } from 'react';
// Correctly import createClient from the ESM build for Vite
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { LogOut, Send, Hash, MessageSquare, Check, Mail } from 'lucide-react';

// --- SUPABASE SETUP ---
// This is how Vite handles environment variables.
// You will create a .env.local file in your project root for these.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChanged((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-800 text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-700 text-gray-200">
      {!session ? <AuthComponent /> : <ChatLayout key={session.user.id} session={session} />}
    </div>
  );
}


// --- AUTHENTICATION COMPONENT ---
function AuthComponent() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      alert(`Error: ${error.error_description || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (submitted) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-800 p-4">
          <div className="text-center bg-gray-700 p-8 rounded-xl shadow-2xl max-w-md">
            <Check className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Check your email!</h1>
            <p className="text-gray-300">
              We've sent a magic login link to <span className="font-bold text-blue-400">{email}</span>.
            </p>
          </div>
        </div>
      );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-800 p-4">
      <div className="w-full max-w-md bg-gray-700 rounded-xl shadow-2xl p-8">
        <div className="flex items-center justify-center mb-6">
            <MessageSquare className="h-10 w-10 text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Supa-Discord Clone</h1>
        </div>
        <p className="text-center text-gray-300 mb-6">Sign in via magic link with your email</p>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  className="bg-gray-800 border border-gray-600 rounded-lg w-full py-3 pl-10 pr-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
            </div>
          </div>
          <button
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all ${loading ? 'opacity-50' : ''}`}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </div>
  );
}


// --- MAIN CHAT LAYOUT ---
function ChatLayout({ session }) {
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchChannels = async () => {
            const { data, error } = await supabase.from('channels').select('*');
            if (error) console.error('Error fetching channels:', error);
            else {
                setChannels(data);
                if(data.length > 0) setActiveChannel(data[0]);
            }
        };
        fetchChannels();
    }, []);
    
    useEffect(() => {
        if (!activeChannel) return;
        const fetchMessages = async () => {
            const { data, error } = await supabase.from('messages').select('*').eq('channel_id', activeChannel.id).order('created_at');
            if (error) console.error('Error fetching messages:', error);
            else setMessages(data);
        };
        fetchMessages();
    }, [activeChannel]);

    useEffect(() => {
        if (!activeChannel) return;
        const subscription = supabase
            .channel(`public:messages:channel_id=eq.${activeChannel.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                setMessages(currentMessages => [...currentMessages, payload.new]);
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [activeChannel]);
    
    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (content && activeChannel) {
            await supabase.from('messages').insert({ content, channel_id: activeChannel.id, user_id: session.user.id });
            setNewMessage('');
        }
    };

    const handleLogout = () => supabase.auth.signOut();

    return (
        <div className="flex h-screen">
            <aside className="w-64 bg-gray-800 flex flex-col">
                <div className="p-4 font-bold text-lg border-b border-gray-900 shadow-md">Supa-Discord</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Channels</h2>
                    {channels.map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel)}
                            className={`w-full text-left flex items-center p-2 rounded-md ${activeChannel?.id === channel.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                            <Hash className="h-5 w-5 mr-2" /> {channel.name}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-900">
                    <div className="flex items-center">
                        <p className="text-sm font-semibold text-white truncate flex-1 min-w-0">{session.user.email}</p>
                        <button onClick={handleLogout} className="p-2 rounded-md hover:bg-red-500" title="Logout">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col">
                {activeChannel && (
                    <>
                    <header className="flex items-center p-4 border-b border-gray-900 shadow-sm bg-gray-700">
                        <Hash className="h-6 w-6 text-gray-400 mr-2" />
                        <h1 className="text-xl font-semibold text-white">{activeChannel.name}</h1>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                        {messages.map(msg => (
                           <div key={msg.id} className="flex items-start p-2 hover:bg-gray-900/50 rounded-md">
                             <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 mr-3 mt-1"></div>
                             <div>
                               <p className="font-semibold text-blue-400 text-sm">
                                    {msg.user_id.substring(0, 8)}
                                    <span className="text-gray-400 font-normal text-xs ml-2">{new Date(msg.created_at).toLocaleTimeString()}</span>
                               </p>
                               <p className="text-gray-200">{msg.content}</p>
                             </div>
                           </div>
                        ))}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 bg-gray-700 border-t border-gray-900">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                placeholder={`Message #${activeChannel.name}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full bg-gray-600 rounded-lg p-3 pr-12 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2" disabled={!newMessage.trim()}>
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                  </>
                )}
            </main>
        </div>
    );
}
