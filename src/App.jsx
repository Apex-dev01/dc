import React, { useState, useEffect, useRef } from 'react';
// FIX: The build environment could not find the '@supabase/supabase-js' package.
// Reverting to a stable, versioned CDN link to ensure the library can be found.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { LogOut, Send, Hash, MessageSquare, Check, Mail, AlertTriangle } from 'lucide-react';

// --- SUPABASE SETUP ---
// This code now reads from Vercel's environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


// This check is a safeguard. If the variables are missing, it will show an error screen.
if (!supabaseUrl || !supabaseAnonKey) {
  // This will be caught by the App component and will render the error message.
  // We're throwing a generic error here to be handled gracefully below.
  // Note: We avoid creating the client here to prevent further errors.
}


const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER COMPONENT FOR ERRORS ---
function MissingKeysError() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-red-900/20 p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-2xl text-center border border-red-500">
        <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-3">Configuration Error</h1>
        <p className="text-gray-300 mb-6">
          Your Supabase URL or Key is missing. The application cannot connect to the database, which is why you are seeing this message instead of a blank page.
        </p>
        <div className="text-left bg-gray-900/50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">How to Fix This:</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
                <li>Go to your project settings on the <span className="font-bold text-blue-400">Vercel Dashboard</span>.</li>
                <li>Navigate to the <span className="font-bold text-blue-400">Environment Variables</span> section.</li>
                <li>Ensure you have two variables named <code className="bg-gray-700 p-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-gray-700 p-1 rounded">VITE_SUPABASE_ANON_KEY</code> with the correct values from your Supabase project.</li>
                <li><span className="font-bold text-white">Redeploy</span> your project from the Vercel dashboard to apply the changes.</li>
            </ol>
        </div>
      </div>
    </div>
  );
}


// --- MAIN APP COMPONENT ---
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if the keys are missing before doing anything else.
  if (!supabaseUrl || !supabaseAnonKey) {
    return <MissingKeysError />;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // This is the correct way to use the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChanged((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        setLoading(false);
      }
    });

    // Cleanup the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-800 text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-lg">Loading Your Awesome Chat App...</p>
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
// This component remains the same as before.
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
              We've sent a magic login link to <span className="font-bold text-blue-400">{email}</span>. Click the link to sign in.
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
        <p className="text-center text-gray-300 mb-6">Sign in via magic link with your email below</p>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 text-sm font-bold mb-2">Email Address</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  className="bg-gray-800 border border-gray-600 shadow appearance-none rounded-lg w-full py-3 pl-10 pr-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
            </div>
          </div>
          <button
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-200 flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
                'Send Magic Link'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


// --- MAIN CHAT LAYOUT ---
// This component remains the same as before.
function ChatLayout({ session }) {
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Fetch initial data
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
    
    // Fetch messages for the active channel
    useEffect(() => {
        if (!activeChannel) return;
        
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('channel_id', activeChannel.id)
                .order('created_at', { ascending: true });
            
            if (error) console.error('Error fetching messages:', error);
            else setMessages(data);
        };
        fetchMessages();

    }, [activeChannel]);

    // Listen for new messages in real-time
    useEffect(() => {
        if (!activeChannel) return;

        const subscription = supabase.channel(`public:messages:channel_id=eq.${activeChannel.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` }, payload => {
                setMessages(currentMessages => [...currentMessages, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [activeChannel]);
    
    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);


    const handleSendMessage = async (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (content && activeChannel) {
            const { error } = await supabase.from('messages').insert({
                content,
                channel_id: activeChannel.id,
                user_id: session.user.id
            });
            if (error) {
                console.error('Error sending message:', error);
            } else {
                setNewMessage('');
            }
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 flex flex-col">
                <div className="p-4 font-bold text-lg border-b border-gray-900 shadow-md">Supa-Discord</div>
                <div className="flex-1 overflow-y-auto p-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Channels</h2>
                    <ul>
                        {channels.map(channel => (
                            <li key={channel.id}>
                                <button
                                    onClick={() => setActiveChannel(channel)}
                                    className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 ${activeChannel?.id === channel.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                >
                                    <Hash className="h-5 w-5 mr-2" />
                                    {channel.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 border-t border-gray-900 bg-gray-850">
                    <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{session.user.email}</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 rounded-md hover:bg-red-500 text-gray-300 hover:text-white transition-colors duration-200" title="Logout">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {!activeChannel ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-xl text-gray-400">Select a channel to start chatting</p>
                    </div>
                ) : (
                    <>
                    {/* Header */}
                    <header className="flex items-center p-4 border-b border-gray-900 shadow-sm bg-gray-700">
                        <Hash className="h-6 w-6 text-gray-400 mr-2" />
                        <h1 className="text-xl font-semibold text-white">{activeChannel.name}</h1>
                        <p className="ml-4 text-sm text-gray-400">{activeChannel.description}</p>
                    </header>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                        {messages.length > 0 ? messages.map(msg => (
                           <div key={msg.id} className="flex items-start p-2 hover:bg-gray-900/50 rounded-md">
                             <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 mr-3 mt-1 flex items-center justify-center font-bold text-white">
                                {msg.user_id.substring(0, 2).toUpperCase()}
                             </div>
                             <div>
                               <p className="font-semibold text-blue-400 text-sm">
                                    {/* In a real app, you'd fetch user profiles to show names */}
                                    {session.user.id === msg.user_id ? "You" : `User ${msg.user_id.substring(0,6)}`}
                                    <span className="text-gray-400 font-normal text-xs ml-2">{new Date(msg.created_at).toLocaleTimeString()}</span>
                               </p>
                               <p className="text-gray-200">{msg.content}</p>
                             </div>
                           </div>
                        )) : (
                            <div className="text-center text-gray-400 mt-8">
                                <p>Be the first to send a message in #{activeChannel.name}!</p>
                            </div>
                        )}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-4 bg-gray-700 border-t border-gray-900">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                placeholder={`Message #${activeChannel.name}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full bg-gray-600 rounded-lg p-3 pr-12 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-300 hover:bg-blue-600 hover:text-white transition-colors duration-200" disabled={!newMessage.trim()}>
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


