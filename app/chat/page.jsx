//Chat page
"use client";
import FallbackLayout from "./FallbackLayout";
import React, { Suspense, useState, useEffect, useRef } from "react";
import {
  Lightbulb,
  Menu,
  X,
  User,
  LogOut,
  Send,
  LayoutDashboard,
  MessageCircleMore,
  EllipsisVertical,
  Edit,
  Trash2,
  Pin,
  UserPlus,
} from "lucide-react";
import { Mic, MicOff } from "lucide-react";
import { TiPinOutline } from "react-icons/ti";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaCopy, FaWhatsapp, FaEnvelope } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { RiEditLine } from "react-icons/ri";
import { getSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

export default function AskDoubtPage({ isSidebarOpen, setIsSidebarOpen }) {
  return (
    <Suspense
      fallback={
        <FallbackLayout
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const menuRef = useRef(null);
  const menuRefs = useRef({});
  const deleteModalRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null); // info of the chatting friend
  const [chatboxId, setChatboxId] = useState(null); // current chatbox ID
  const [friends, setFriends] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [user, setUser] = useState({ name: "", image: "" });
  //text message by speaking user
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socket = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [updatedChatboxId, setUpdatedChatboxId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [onlineMap, setOnlineMap] = useState({});
  const handleCopy = (text) => navigator.clipboard.writeText(text);
  const sendToWhatsApp = (text) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  const sendToGmail = (text) => {
    const subject = encodeURIComponent("ChatterlyAI");
    const body = encodeURIComponent(text);
    const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&to=&su=${subject}&body=${body}&tf=cm`;
    window.open(gmailUrl, "_blank");
  };

  // ✅ For editing friend name inline
  const [editingFriendId, setEditingFriendId] = useState(null);
  const [editedFriendName, setEditedFriendName] = useState("");

  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendInput, setNewFriendInput] = useState("");

  // ✅ Get email from localStorage
  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        localStorage.setItem("email", session.user.email);
      } else {
        setMessages([
          {
            role: "bot",
            text: "⚠️ Please log in again. User session is missing.",
          },
        ]);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session || !session.user) {
        router.push("/login");
        return;
      } else {
        setUser({
          name: session.user.name || "",
          image: session.user.image || "",
        });
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    const fetchFriends = async () => {
      const res = await fetch(`/api/get-friends?email=${userEmail}`);
      const data = await res.json();
      setFriends(
        data.friends.sort((a, b) => {
          if (a.pinned === b.pinned) {
            return new Date(b.lastModified) - new Date(a.lastModified);
          }
          return a.pinned ? -1 : 1;
        })
      );

      // socket.current?.emit("request-online-users");

      // ✅ Prefer chatboxId from URL, else fallback to last stored
      const chatboxIdFromUrl = searchParams.get("chatboxId");
      if (chatboxIdFromUrl) {
        const fromUrl = data.friends.find(
          (f) => f.chatbox_id === chatboxIdFromUrl
        );
        if (fromUrl) {
          handleFriendSelect(fromUrl);
          return;
        }
      }

      // const lastId = localStorage.getItem("lastChatboxId");
      // if (lastId) {
      //   const last = data.friends.find((f) => f.chatbox_id === lastId);
      //   if (last) {
      //     handleFriendSelect(last);
      //   }
      // }
    };
    fetchFriends();
  }, [userEmail]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Current open chat's button ref (if exists)
      const currentButtonRef = menuRefs.current[menuOpenId];

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        (!currentButtonRef || !currentButtonRef.contains(event.target))
      ) {
        setMenuOpenId(null);
      }
    };

    if (menuOpenId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpenId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showDeleteConfirm &&
        deleteModalRef.current &&
        !deleteModalRef.current.contains(event.target)
      ) {
        setShowDeleteConfirm(false);
        setChatToDelete(null);
      }
    };

    if (showDeleteConfirm) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDeleteConfirm]);

  // useEffect(() => {
  //   const handleGlobalKeydown = (e) => {
  //     const isAllowed = /^[a-zA-Z0-9 ]$/.test(e.key)
  //     if (isAllowed && document.activeElement !== inputRef.current) {
  //       e.preventDefault()
  //       inputRef.current?.focus()
  //       setInput((prev) => prev + e.key)
  //     }
  //   }
  //   window.addEventListener("keydown", handleGlobalKeydown)
  //   return () => {
  //     window.removeEventListener("keydown", handleGlobalKeydown)
  //   }
  // }, [])

  useEffect(() => {
    if (!userEmail) return;
    if (!socket.current) {
      socket.current = io(process.env.NEXT_PUBLIC_CHAT_SOCKET_BACKEND_URL, {
        transports: ["websocket"], // ensure real-time connection
      });

      socket.current.emit("online-room", userEmail);

      // 2️⃣ After online registered, request full list
      socket.current.emit("request-online-users");

      socket.current.on("user-online-status", ({ email, isOnline }) => {
        setOnlineMap((prev) => ({
          ...prev,
          [email]: isOnline,
        }));
      });

      socket.current.on("online-users-list", (list) => {
        setOnlineMap((prev) => {
          const newMap = { ...prev };
          list.forEach((email) => {
            newMap[email] = true;
          });
          return newMap;
        });
      });

      socket.current.emit("join-chat-room", chatboxId);
      socket.current.on("chat-created", async () => {
        const res = await fetch(`/api/get-friends?email=${userEmail}`);
        const data = await res.json();

        setFriends(
          data.friends.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.lastModified) - new Date(a.lastModified);
          })
        );
      });

      socket.current.on("chat-deleted", ({ chatboxId }) => {
        setFriends((prev) => prev.filter((f) => f.chatbox_id !== chatboxId));
      });
    }
    // socket.current.emit("join-room", chatboxId);

    // 🟢 Message edited
    socket.current.on("message-edited", ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, text: newText } : msg
        )
      );
    });

    // 🔴 Message deleted
    socket.current.on("message-deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    socket.current.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);

      // Dynamically reorder the friends list
      setFriends((prevFriends) => {
        const updated = prevFriends.map((f) => {
          if (f.chatbox_id === message.chatboxId) {
            return { ...f, lastModified: new Date().toISOString() };
          }
          return f;
        });
        const sorted = updated.sort((a, b) => {
          if (a.pinned === b.pinned) {
            return new Date(b.lastModified) - new Date(a.lastModified);
          }
          return a.pinned ? -1 : 1; // keep pinned on top
        });

        setUpdatedChatboxId(message.chatboxId);
        setTimeout(() => setUpdatedChatboxId(null), 800); // reset after animation

        return sorted;
      });
    });

    return () => {
      socket.current?.off("receive-message");
      socket.current?.off("message-deleted");
      socket.current?.off("message-edited");
      socket.current?.off("chat-created");
      socket.current?.off("chat-deleted");
      socket.current?.disconnect();
      socket.current = null;
    };
  }, [userEmail, chatboxId]);

  // ✅ Function to handle save after editing friend name inline
  const handleEditChatName = async (friendId) => {
    if (!editedFriendName.trim()) {
      alert("Please enter a valid name.");
      return;
    }

    try {
      const userEmail = localStorage.getItem("email");

      const res = await fetch("/api/edit-frnd-chat-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          chatboxId: friendId,
          newName: editedFriendName.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFriends((prev) =>
          prev.map((frnd) =>
            frnd.chatbox_id === friendId
              ? { ...frnd, name: editedFriendName.trim() }
              : frnd
          )
        );

        if (selectedFriend?.chatbox_id === friendId) {
          setSelectedFriend((prev) => ({
            ...prev,
            name: editedFriendName.trim(),
          }));
        }

        // ✅ Reset editing mode
        setEditingFriendId(null);
        setEditedFriendName("");
      } else {
        alert(data.message || "Failed to update name.");
      }
    } catch (error) {
      console.error("Error updating chat name:", error);
      alert("Something went wrong while updating name.");
    }
  };

  // ✅ Delete a chat and remove it from friend list safely
  const handleDeleteChatName = async (friend) => {
    try {
      const userEmail = localStorage.getItem("email");
      if (!userEmail || !friend.chatbox_id) {
        alert("Invalid user or chatbox data.");
        return;
      }

      const res = await fetch("/api/delete-chatbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          chatboxId: friend.chatbox_id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete chat.");
      }

      // ✅ Notify both users that this chat was deleted
      socket.current?.emit("chat-deleted", {
        chatboxId: friend.chatbox_id,
        users: [userEmail, friend.email],
      });

      // ✅ Remove from UI immediately
      setFriends((prev) =>
        prev.filter((f) => f.chatbox_id !== friend.chatbox_id)
      );

      // If user is viewing this chat, clear it
      if (selectedFriend?.chatbox_id === friend.chatbox_id) {
        setSelectedFriend(null);
        setMessages([]);
      }

      setMenuOpenId(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert(error.message || "Something went wrong while deleting chat.");
    }
  };

  const handlePinChatName = async (friend) => {
    try {
      const userEmail = localStorage.getItem("email");
      if (!userEmail || !friend.chatbox_id) {
        alert("Invalid user or chatbox data.");
        return;
      }

      const res = await fetch("/api/pin-chatbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          chatboxId: friend.chatbox_id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to pin chat.");
      }

      // ✅ Update the pinned state locally (no reload needed)
      setFriends((prev) =>
        prev
          .map((f) =>
            f.chatbox_id === friend.chatbox_id
              ? { ...f, pinned: !f.pinned } // toggle pinned field
              : f
          )
          .sort((a, b) => {
            if (a.pinned === b.pinned) {
              return new Date(b.lastModified) - new Date(a.lastModified);
            }
            return a.pinned ? -1 : 1; // pinned on top
          })
      );

      // ✅ Highlight for quick feedback
      setUpdatedChatboxId(friend.chatbox_id);
      setTimeout(() => setUpdatedChatboxId(null), 800);

      setMenuOpenId(null);
    } catch (error) {
      console.error("Error pinning chat:", error);
      alert(error.message || "Something went wrong while pinning chat.");
    }
  };

  // const handleNewChat = async () => {
  //   const searchValue = prompt(
  //     "Enter your friend's email or name to start a new chat:"
  //   );

  //   const userEmail = localStorage.getItem("email");
  //   if (!searchValue || !userEmail) return;

  //   const existingChat = friends.find(
  //     (frnd) => frnd.email === searchValue || frnd.name === searchValue
  //   );
  //   if (existingChat) {
  //     handleFriendSelect(existingChat);
  //     return;
  //   }

  //   try {
  //     const res = await fetch("/api/create-chatbox", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ userEmail, friendEmail: searchValue }),
  //     });

  //     const data = await res.json();

  //     if (data.success) {
  //       const newFriend = {
  //         chatbox_id: data.chatbox._id,
  //         email: data.friend.email,
  //         name: data.friend.name,
  //         lastModified: new Date().toISOString(),
  //       };

  //       // Add friend to user's frnd_arr
  //       const response = await fetch("/api/add-friend", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           userEmail,
  //           friendEmail: newFriend.email,
  //           chatboxId: newFriend.chatbox_id,
  //         }),
  //       });

  //       const addFriendData = await response.json();

  //       if (!response.ok || !addFriendData.success) {
  //         alert(
  //           addFriendData.message || "Something went wrong while adding friend."
  //         );
  //         return; // exit early if add-friend failed
  //       }

  //       setFriends((prev) => {
  //         const updated = [...prev, newFriend];
  //         return updated.sort(
  //           (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
  //         );
  //       });

  //       handleFriendSelect(newFriend);
  //     } else {
  //       alert(data.message || "Failed to create chat.");
  //     }
  //   } catch (err) {
  //     alert("Something went wrong.");
  //   }
  // };

  // Open the modal
  const openAddFriendModal = () => {
    setIsAddFriendModalOpen(true);
  };

  // Handle form submission
  const handleAddFriendSubmit = async () => {
    const friendEmail = newFriendInput.trim();
    const friendName = newFriendName.trim();
    const userEmail = localStorage.getItem("email");
    if (!friendEmail || !userEmail || !friendName) {
      alert("Please enter both friend's name and email.");
      return;
    }

    const existingChat = friends.find(
      (frnd) => frnd.email === friendEmail || frnd.name === friendName
    );
    if (existingChat) {
      handleFriendSelect(existingChat);
      setIsAddFriendModalOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/create-chatbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, friendEmail, friendName }),
      });
      // console.log(
      //   "userEmail:",
      //   userEmail,
      //   "friendEmail:",
      //   friendEmail,
      //   "friendName:",
      //   friendName
      // );
      const data = await res.json();

      if (data.success) {
        const newFriend = {
          chatbox_id: data.chatbox._id,
          email: data.friend.email,
          name: friendName,
          lastModified: new Date().toISOString(),
        };

        await fetch("/api/add-friend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail,
            friendName: newFriend.name,
            friendEmail: newFriend.email,
            chatboxId: newFriend.chatbox_id,
          }),
        });

        // ✅ Tell the server to notify both users
        socket.current?.emit("chat-created", {
          chatbox: newFriend,
          users: [userEmail, data.friend.email],
        });

        setFriends((prev) => {
          const updated = [...prev, { ...newFriend, pinned: false }]; // ensure new friend is unpinned

          // Sort so pinned chats stay on top, unpinned below them by time
          return updated.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.lastModified) - new Date(a.lastModified);
          });
        });

        handleFriendSelect(newFriend);
        router.replace(`/chat?chatboxId=${newFriend.chatbox_id}`);
        setIsAddFriendModalOpen(false);
        setNewFriendInput("");
      } else {
        alert(data.message || "Failed to create chat.");
      }
    } catch (err) {
      alert("Something went wrong.");
    }
  };

  const handleFriendSelect = async (friend) => {
    setSelectedFriend(friend);
    socket.current.emit("join-chat-room", friend.chatbox_id);
    // localStorage.setItem("lastChatboxId", friend.chatbox_id);
    router.replace(`/chat?chatboxId=${friend.chatbox_id}`);

    // Step 1: Fetch chatbox details
    const res = await fetch(`/api/get-chatbox?chatbox_id=${friend.chatbox_id}`);
    const data = await res.json();

    const messageIds = data.chatbox.messages;

    // Step 2: Fetch full message objects using the message ObjectIds
    const msgRes = await fetch("/api/get-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds }),
    });

    const { messages: fullMessages } = await msgRes.json();

    // Step 3: Update state
    setChatboxId(data.chatbox._id);
    setMessages(fullMessages); // fullMessages is an array of complete message objects
  };
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true; // for live preview
    recognition.continuous = false; // stops after one pause in speech

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript + " ";
        }
      }

      if (final) {
        setInput((prev) => prev + " " + final);
      }
      setLiveTranscript(interim);
    };

    recognition.onend = () => {
      setListening(false);
      setLiveTranscript(""); // clear interim preview
    };
    recognition.onerror = (e) => {
      // Chrome gives empty {} sometimes, so normalize
      const error = e.error || "";

      // Ignore harmless "no-speech" and "aborted" events
      if (error === "no-speech" || error === "aborted") {
        setListening(false);
        setLiveTranscript("");
        return;
      }

      // Real errors only
      console.error("Speech Recognition Error:", e);
      setListening(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
  }, []);
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setLiveTranscript("");
    }

    setListening((prev) => !prev);
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatboxId || !userEmail) return;

    const res = await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderEmail: userEmail,
        roomId: chatboxId,
        text: input,
      }),
    });

    const result = await res.json();
    if (res.ok && result.success) {
      const message = {
        senderEmail: userEmail,
        roomId: chatboxId,
        text: input,
      };

      socket.current.emit("send-message", message);
      setInput("");
      setFriends((prevFriends) => {
        const updated = prevFriends.map((f) =>
          f.chatbox_id === chatboxId
            ? { ...f, lastModified: new Date().toISOString() }
            : f
        );

        const sorted = updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.lastModified) - new Date(a.lastModified);
        });
        return sorted;
      });
    } else {
      alert("Failed to send message.");
    }
  };

  const handleEditMessage = (index) => {
    setEditingIndex(index);
    setEditingText(messages[index].text);
  };

  const confirmEditMessage = async () => {
    const updatedMsg = messages[editingIndex];

    const res = await fetch("/api/edit-chat-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: updatedMsg._id,
        newText: editingText,
      }),
    });

    const result = await res.json();

    if (result.success) {
      const newMessages = [...messages];
      newMessages[editingIndex].text = editingText;
      setMessages(newMessages);
      setEditingIndex(null);
      setEditingText("");

      socket.current?.emit("edit-message", {
        messageId: updatedMsg._id,
        newText: editingText,
        roomId: chatboxId, // required for server to emit to room
      });
    } else {
      alert("Failed to edit message.");
    }
  };

  const handleDeleteMessage = async (index) => {
    const msg = messages[index];
    const res = await fetch("/api/delete-chat-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: msg._id,
        chatboxId: chatboxId,
      }),
    });

    const result = await res.json();

    if (result.success) {
      setMessages((prev) => prev.filter((_, i) => i !== index));

      // ✅ Emit socket event to update other user
      socket.current?.emit("delete-message", {
        messageId: msg._id,
        roomId: chatboxId,
      });
    } else {
      alert("Failed to delete message.");
    }
  };

  // handling the logout of a user
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST" });

      if (res.ok) {
        // Clear LocalStorage
        localStorage.removeItem("auth_token");
        localStorage.clear(); // optional: clears all keys
        sessionStorage.clear();
        window.location.href = "/login";
        router.push("/login");
        // Optional: redirect user
        // window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest("button") // ignore clicks on the toggle button
      ) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

//   return (
//     // <Suspense
//     //   fallback={
//     //     <FallbackLayout
//     //       isSidebarOpen={isSidebarOpen}
//     //       setIsSidebarOpen={setIsSidebarOpen}
//     //     />
//     //   }
//     // >
//     <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 relative">
//       {/* Sidebar */}

//       <div
//         ref={sidebarRef}
//         className={`fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-md border-r border-white/20 z-50 transform transition-transform duration-300 ${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } lg:translate-x-0`}
//       >
//         <div className="p-6">
//           <div className="flex items-center justify-between mb-8">
//             <div className="flex items-center space-x-2">
//               <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
//                 <img
//                   src="/chatterly_logo.png"
//                   alt="logo"
//                   className="w-full h-full object-cover rounded-md"
//                 />
//               </div>
//               <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
//                 ChatterlyAI
//               </span>
//             </div>

//             {/* Close button pushed to the right */}
//             <div className="flex-1 flex justify-end lg:hidden">
//               <button
//                 onClick={() => setIsSidebarOpen(false)}
//                 className="p-1 hover:bg-gray-200 rounded-md"
//               >
//                 <X className="w-5 h-5 text-gray-600" />
//               </button>
//             </div>
//           </div>

//           <nav className="space-y-2">
//             <Link
//               href="/dashboard"
//               className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
//             >
//               <LayoutDashboard className="w-5 h-5" />
//               <span>Dashboard</span>
//             </Link>
//             <Link
//               href="/ask-doubt"
//               className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl"
//             >
//               <Lightbulb className="w-5 h-5" />
//               <span>Chatbot</span>
//             </Link>

//             <Link
//               href="/chat"
//               className="flex items-center space-x-3 px-4 py-3 bg-purple-100 text-purple-700 rounded-xl transition-colors"
//             >
//               <MessageCircleMore className="w-5 h-5" />
//               <span>Chat with Friends</span>
//             </Link>
//             <hr className="border-t-2 border-gray-400 rounded-full my-4 shadow-sm" />
//             <button
//               onClick={openAddFriendModal}
//               className="w-full text-left px-4 py-2 mb-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl transition-colors flex items-center space-x-3"
//             >
//               {/* Assuming UserPlus is a React component that renders an SVG icon */}
//               <UserPlus className="w-5 h-5" />
//               <span>New Friend Chat</span>
//             </button>
//             <hr className="border-t-2 border-gray-400 rounded-full mb-3 my-4 shadow-sm" />
//             {/* <Link href="/profile" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
//               <User className="w-5 h-5" />
//               <span>Profile</span>
//             </Link> */}
//             {/* {friends.map((frnd, i) => (
//           <button */}
//             <AnimatePresence>
//               {friends.length === 0 && (
//                 <p className="text-xs text-gray-400 px-4 italic py-2">
//                   No previous chats
//                 </p>
//               )}

//               {friends.map((frnd) => (
//                 <div key={frnd.chatbox_id} className="relative group">
//                   {editingFriendId === frnd.chatbox_id ? (
//                     // Inline editable mode
//                     <input
//                       type="text"
//                       value={editedFriendName}
//                       onChange={(e) => setEditedFriendName(e.target.value)}
//                       onBlur={() => {
//                         if (
//                           editedFriendName.trim() &&
//                           editedFriendName !== frnd.name
//                         ) {
//                           handleEditChatName(frnd.chatbox_id);
//                         }
//                         setEditingFriendId(null);
//                       }}
//                       onKeyDown={(e) => {
//                         if (e.key === "Enter") {
//                           e.preventDefault();
//                           if (
//                             editedFriendName.trim() &&
//                             editedFriendName !== frnd.name
//                           ) {
//                             handleEditChatName(frnd.chatbox_id);
//                           }
//                           setEditingFriendId(null);
//                         } else if (e.key === "Escape") {
//                           setEditingFriendId(null);
//                         }
//                       }}
//                       className={`max-w-[73%] bg-white text-gray-900 border border-purple-10 focus:ring-2 focus:ring-purple-300 rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200`}
//                       autoFocus
//                     />
//                   ) : (
//                     <button
//                       onClick={() => handleFriendSelect(frnd)}
//                       onDoubleClick={() => {
//                         setEditingFriendId(frnd.chatbox_id);
//                         setEditedFriendName(frnd.name || "");
//                       }}
//                       className={`w-full text-left px-4 py-2 rounded-xl transition-colors transform duration-300 ${
//                         selectedFriend?.chatbox_id === frnd.chatbox_id
//                           ? "bg-purple-200 text-purple-800"
//                           : "hover:bg-gray-100 text-gray-700"
//                       } ${
//                         updatedChatboxId === frnd.chatbox_id
//                           ? "scale-[1.03] shadow-md"
//                           : ""
//                       }`}
//                     >
//                       <span className="block truncate max-w-[75%]  items-center gap-1">
//                         {/* <span>{frnd.name || frnd.email}</span> */}
//                         <span className="flex items-center gap-2">
//                           <span>
//                             {frnd.name
//                               ? frnd.name.length > 12
//                                 ? frnd.name.slice(0, 12) + "..."
//                                 : frnd.name
//                               : frnd.email}
//                           </span>
//                           {onlineMap[frnd.email] && (
//                             <span className="w-2 h-2 bg-green-500 rounded-full"></span>
//                           )}
//                         </span>
//                       </span>
//                     </button>
//                   )}
//                   <div className="absolute top-[18%] right-2 flex items-center gap-1">
//                     {/* 📌 Pin icon before three dots */}
//                     {frnd.pinned && (
//                       <span
//                         role="img"
//                         aria-label="Pinned Chat"
//                         title="Pinned Chat"
//                         className="text-purple-600 text-sm translate-y-[1px]"
//                       >
//                         <TiPinOutline size={16} className="text-yellow-600" />
//                       </span>
//                     )}
//                     {/* 3-dot menu trigger */}
//                     <button
//                       ref={(el) => (menuRefs.current[frnd.chatbox_id] = el)}
//                       onClick={(e) => {
//                         e.preventDefault();
//                         setMenuOpenId((prev) =>
//                           prev === frnd.chatbox_id ? null : frnd.chatbox_id
//                         );
//                       }}
//                       className={`p-1 rounded transition-colors ${
//                         menuOpenId === frnd.chatbox_id
//                           ? "bg-gray-200"
//                           : "hover:bg-gray-100"
//                       }`}
//                     >
//                       <EllipsisVertical size={16} />
//                     </button>
//                   </div>

//                   {/* Dropdown menu */}
//                   <AnimatePresence>
//                     {menuOpenId === frnd.chatbox_id && (
//                       <motion.div
//                         ref={menuRef}
//                         key={frnd.chatbox_id}
//                         initial={{ opacity: 0, y: -6, scale: 0.97 }}
//                         animate={{ opacity: 1, y: 0, scale: 1 }}
//                         exit={{ opacity: 0, y: -6, scale: 0.97 }}
//                         transition={{ duration: 0.18, ease: "easeOut" }}
//                         className="absolute right-2 top-8 bg-white shadow-lg rounded-xl border border-gray-200 z-20 w-44 text-sm overflow-hidden backdrop-blur-sm bg-opacity-90
//                  transition-all duration-200 transform origin-top-right hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
//                       >
//                         <button
//                           onClick={() => {
//                             setEditingFriendId(frnd.chatbox_id);
//                             setEditedFriendName(frnd.name || "");
//                             setMenuOpenId(null);
//                           }}
//                           className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
//                         >
//                           <Edit size={14} /> Edit Name
//                         </button>

//                         {/* <button
//                           onClick={() => handleDeleteChatName(frnd)}
//                           className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left text-red-600"
//                         >
//                           <Trash2 size={14} /> Delete Chat
//                         </button> */}
//                         <button
//                           onClick={() => {
//                             setChatToDelete(frnd);
//                             setShowDeleteConfirm(true);
//                             setMenuOpenId(null);
//                           }}
//                           className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left text-red-600"
//                         >
//                           <Trash2 size={14} /> Delete Chat
//                         </button>

//                         {frnd.pinned ? (
//                           <button
//                             onClick={() => handlePinChatName(frnd)}
//                             className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left text-purple-700"
//                           >
//                             <Pin size={14} /> Unpin Chat
//                           </button>
//                         ) : (
//                           <button
//                             onClick={() => handlePinChatName(frnd)}
//                             className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left text-purple-700"
//                           >
//                             <Pin size={14} /> Pin Chat
//                           </button>
//                         )}
//                       </motion.div>
//                     )}
//                   </AnimatePresence>
//                 </div>
//               ))}
//             </AnimatePresence>
//           </nav>
//         </div>
//         <div className="absolute bottom-6 left-6 right-6">
//           <button
//             onClick={handleLogout}
//             className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
//           >
//             <LogOut className="w-5 h-5" />
//             <span>Logout</span>
//           </button>
//         </div>
//       </div>

//       {/* Main Section */}
//       <div className="flex flex-col flex-1 lg:ml-64">
//         {/* Header */}
//         <header className="bg-white/70 backdrop-blur-md border-b border-white/20 px-6 py-4 sticky top-0 z-20">
//           <div className="flex items-center justify-between">
//             {/* Left section: Menu toggle + Heading + Back Link */}
//             <div className="flex items-center space-x-4">
//               <button
//                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
//               >
//                 {isSidebarOpen ? (
//                   <X className="w-6 h-6" />
//                 ) : (
//                   <Menu className="w-6 h-6" />
//                 )}
//               </button>
//               <h1 className="text-sm md:text-xl lg:text-2xl font-bold text-gray-800 flex items-center space-x-3">
//                 <MessageCircleMore className="w-6 h-6" />
//                 <span>Chat with Friends</span>
//               </h1>
//             </div>

//             {/* Right section: Notification + Profile */}
//             <div className="flex items-center space-x-4">
//               {/* <Link href="/profile">
//                 <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center cursor-pointer">
//                   <User className="w-5 h-5 text-white" />
//                 </div>
//               </Link> */}
//               <Link href="/profile">
//                 <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 cursor-pointer">
//                   {user?.image ? (
//                     <img
//                       src={user.image}
//                       alt="User"
//                       className="w-full h-full object-cover"
//                     />
//                   ) : (
//                     <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
//                       <User className="w-4 h-4 text-white" />
//                     </div>
//                   )}
//                 </div>
//               </Link>
//             </div>
//           </div>
//         </header>

//         {/* Chat Body */}
//         <main className="flex-1 relative overflow-hidden">
//           <div className="h-full flex flex-col">
//             <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-32">
//               {messages.map((msg, idx) => (
//                 <div
//                   key={idx}
//                   className={`flex ${
//                     msg.senderEmail === userEmail
//                       ? "justify-end"
//                       : "justify-start"
//                   }`}
//                 >
//                   <div
//                     className={`px-4 py-3 rounded-xl shadow-md max-w-[100vw] md:max-w-md ${
//                       msg.senderEmail === userEmail
//                         ? "bg-purple-100 rounded-br-none"
//                         : "bg-blue-100 rounded-bl-none self-start"
//                     }`}
//                   >
//                     <div
//                       className={`text-xs font-semibold text-gray-600 mb-1 ${
//                         msg.senderEmail === userEmail
//                           ? "text-right"
//                           : "text-left"
//                       }`}
//                     >
//                       {msg.senderEmail === userEmail
//                         ? "You"
//                         : selectedFriend?.name ||
//                           selectedFriend?.email ||
//                           "Friend"}
//                     </div>

//                     <div className="markdown-content text-sm text-gray-800 max-w-[90vw] md:max-w-md overflow-x-auto whitespace-pre-wrap break-words">
//                       {editingIndex === idx ? (
//                         <div className="space-y-2">
//                           <textarea
//                             value={editingText}
//                             onChange={(e) => setEditingText(e.target.value)}
//                             className="w-full p-2 border rounded"
//                             rows={2}
//                           />
//                           <div className="flex justify-end gap-2 text-sm">
//                             <button
//                               onClick={confirmEditMessage}
//                               className="text-green-600 hover:underline"
//                             >
//                               Save
//                             </button>
//                             <button
//                               onClick={() => {
//                                 setEditingIndex(null);
//                                 setEditingText("");
//                               }}
//                               className="text-gray-600 hover:underline"
//                             >
//                               Cancel
//                             </button>
//                           </div>
//                         </div>
//                       ) : (
//                         <ReactMarkdown
//                           remarkPlugins={[remarkGfm]}
//                           components={{
//                             p: ({ children }) => {
//                               // total length of complete message, not per-paragraph children
//                               const totalLength = (msg.text || "").length;

//                               const isShort =
//                                 msg.role === "user" && totalLength <= 64;

//                               return (
//                                 <p
//                                   className={`mb-1 ${
//                                     isShort ? "text-right" : ""
//                                   }`}
//                                 >
//                                   {children}
//                                 </p>
//                               );
//                             },
//                             a: ({ href, children }) => (
//                               <a
//                                 href={href}
//                                 style={{
//                                   color: "#6cf",
//                                   textDecoration: "underline",
//                                 }}
//                               >
//                                 {children}
//                               </a>
//                             ),
//                             li: ({ children }) => <li>{children}</li>,
//                             code: ({ inline, children }) =>
//                               inline ? (
//                                 <code
//                                   style={{
//                                     backgroundColor: "#333",
//                                     padding: "2px 6px",
//                                     borderRadius: "4px",
//                                   }}
//                                 >
//                                   {children}
//                                 </code>
//                               ) : (
//                                 <div
//                                   style={{
//                                     position: "relative",
//                                     marginBottom: "1rem",
//                                   }}
//                                 >
//                                   <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm max-w-full">
//                                     <code>
//                                       {typeof children === "string"
//                                         ? children
//                                         : Array.isArray(children)
//                                         ? children.join("")
//                                         : ""}
//                                     </code>
//                                   </pre>
//                                   <div
//                                     style={{
//                                       position: "absolute",
//                                       top: 6,
//                                       right: 8,
//                                       display: "flex",
//                                       gap: "8px",
//                                     }}
//                                   >
//                                     <button
//                                       onClick={() =>
//                                         handleCopy(
//                                           Array.isArray(children)
//                                             ? children.join("")
//                                             : children
//                                         )
//                                       }
//                                       title="Copy"
//                                       className="action-button"
//                                       style={{
//                                         background: "none",
//                                         border: "none",
//                                         cursor: "pointer",
//                                       }}
//                                     >
//                                       <FaCopy />
//                                     </button>
//                                     <button
//                                       onClick={() => sendToWhatsApp(children)}
//                                       title="Share via WhatsApp"
//                                       className="action-button"
//                                       style={{
//                                         background: "none",
//                                         border: "none",
//                                         cursor: "pointer",
//                                       }}
//                                     >
//                                       <FaWhatsapp />
//                                     </button>
//                                     <button
//                                       onClick={() => sendToGmail(children)}
//                                       title="Send via Email"
//                                       className="action-button"
//                                       style={{
//                                         background: "none",
//                                         border: "none",
//                                         cursor: "pointer",
//                                       }}
//                                     >
//                                       <FaEnvelope />
//                                     </button>
//                                   </div>
//                                 </div>
//                               ),
//                             table: ({ children }) => (
//                               <div style={{ overflowX: "auto" }}>
//                                 <table className="min-w-[500px] table-auto border border-gray-400 text-sm">
//                                   {children}
//                                 </table>
//                               </div>
//                             ),
//                             thead: ({ children }) => (
//                               <thead style={{ backgroundColor: "#e5e7eb" }}>
//                                 {children}
//                               </thead>
//                             ),
//                             tbody: ({ children }) => <tbody>{children}</tbody>,
//                             tr: ({ children }) => (
//                               <tr style={{ borderBottom: "1px solid #888" }}>
//                                 {children}
//                               </tr>
//                             ),
//                             th: ({ children }) => (
//                               <th className="border border-gray-400 bg-gray-200 px-4 py-2 text-left font-medium">
//                                 {children}
//                               </th>
//                             ),
//                             td: ({ children }) => (
//                               <td className="border border-gray-300 px-4 py-2 text-left">
//                                 {children}
//                               </td>
//                             ),
//                           }}
//                           suppressHydrationWarning
//                         >
//                           {msg.text}
//                         </ReactMarkdown>
//                       )}
//                     </div>

//                     {msg.senderEmail === userEmail && (
//                       <div className="flex gap-4 justify-end items-center mt-2 text-xs text-gray-700">
//                         <button
//                           onClick={() => handleEditMessage(idx)}
//                           title="Edit message"
//                           className="flex items-center gap-1 text-blue-600 hover:underline"
//                         >
//                           <RiEditLine />
//                           <span>Edit</span>
//                         </button>
//                         <button
//                           onClick={() => handleDeleteMessage(idx)}
//                           title="Delete message"
//                           className="flex items-center gap-1 text-red-600 hover:underline"
//                         >
//                           <MdDelete />
//                           <span>Delete</span>
//                         </button>
//                         <button
//                           onClick={() => handleCopy(msg.text)}
//                           title="Copy message"
//                           className="flex items-center gap-1 text-gray-600 hover:text-purple-600 transition"
//                         >
//                           <FaCopy />
//                           <span>Copy</span>
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ))}
//               {loading && (
//                 <p className="text-center text-gray-400">Sending...</p>
//               )}
//               {!loading && messages.length === 0 && (
//                 <p className="text-center text-gray-500">
//                   Start the conversation!
//                 </p>
//               )}
//               {error && <div className="text-sm text-red-500">{error}</div>}
//               <div ref={messagesEndRef} />
//             </div>

//             {/* Chat Input Fixed at Bottom */}
//             {/* <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-white/90 backdrop-blur-md border-t border-gray-200">
//               <div className="flex items-center gap-2"> */}
//             <div className="fixed bottom-0 left-0 right-0 lg:ml-64 bg-white/90 backdrop-blur-lg border-t border-white/20 px-6 py-4 z-40">
//               <div className="flex items-center gap-2 max-w-7xl mx-auto">
//                 <textarea
//                   ref={inputRef}
//                   type="text"
//                   value={input}
//                   onChange={(e) => setInput(e.target.value)}
//                   onInput={(e) => {
//                     e.target.style.height = "auto";
//                     e.target.style.height = `${e.target.scrollHeight}px`;
//                   }}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter" && !e.shiftKey) {
//                       e.preventDefault();
//                       sendMessage(); // only sends once
//                       // RESET SIZE AFTER SEND
//                       const el = inputRef.current;
//                       el.style.height = "auto"; // resets back to initial (rows={3})
//                     }
//                   }}
//                   placeholder="Type your message..."
//                   rows={1}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[4rem] max-h-[12rem] "
//                 />
//                 <>
//                   {/* Mic toggle button */}
//                   <button
//                     onClick={toggleListening}
//                     className={`p-2 rounded-xl border transition ${
//                       listening
//                         ? "bg-red-500 text-white"
//                         : "bg-white text-black"
//                     }`}
//                   >
//                     {listening ? (
//                       <MicOff className="w-5 h-5" />
//                     ) : (
//                       <Mic className="w-5 h-5" />
//                     )}
//                   </button>

//                   {/* Listening modal (NOT inside button) */}
//                   {listening && (
//                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm text-center">
//                       <div className="bg-white rounded-2xl shadow-2xl px-6 py-8 w-[90%] max-w-sm relative flex flex-col items-center gap-4">
//                         {/* Close button */}
//                         <button
//                           onClick={toggleListening}
//                           className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-red-100 rounded-full"
//                           title="Stop Listening"
//                         >
//                           <X className="w-5 h-5 text-red-500" />
//                         </button>

//                         {/* Mic animation */}
//                         <div className="relative mt-2">
//                           <div className="absolute h-16 w-16 bg-green-400 opacity-75 rounded-full animate-ping"></div>
//                           <div className="h-16 w-16 bg-green-600 rounded-full flex items-center justify-center relative z-10">
//                             <Mic className="w-6 h-6 text-white" />
//                           </div>
//                         </div>

//                         <p className="text-gray-600 text-sm font-medium">
//                           Listening…
//                         </p>

//                         {liveTranscript && (
//                           <p className="text-gray-700 text-sm bg-gray-100 rounded-md px-4 py-2 w-full text-center">
//                             {liveTranscript}
//                           </p>
//                         )}

//                         <button
//                           onClick={toggleListening}
//                           className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition"
//                         >
//                           Stop & Continue
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </>
//                 <button
//                   onClick={sendMessage}
//                   className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full transition ${
//                     !input.trim()
//                       ? "opacity-50 cursor-not-allowed"
//                       : "hover:opacity-90"
//                   }`}
//                 >
//                   <Send className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>
//       <AnimatePresence>
//         {showDeleteConfirm && (
//           <motion.div
//             key="deleteConfirm"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             transition={{ duration: 0.2 }}
//             className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
//           >
//             <motion.div
//               ref={deleteModalRef} // ✅ Add this line
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               transition={{ duration: 0.25, ease: "easeOut" }}
//               className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 text-center"
//             >
//               <h2 className="text-lg font-semibold text-gray-800 mb-3">
//                 Delete Chat?
//               </h2>
//               <p className="text-gray-500 text-sm mb-6">
//                 This will permanently delete the chat with{" "}
//                 <span className="font-medium text-gray-700">
//                   {chatToDelete?.name || chatToDelete?.email}
//                 </span>
//                 . This action cannot be undone.
//               </p>

//               <div className="flex justify-center gap-4">
//                 <button
//                   onClick={() => {
//                     setShowDeleteConfirm(false);
//                     setChatToDelete(null);
//                   }}
//                   className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition"
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   onClick={async () => {
//                     if (chatToDelete) {
//                       await handleDeleteChatName(chatToDelete);
//                     }
//                     setShowDeleteConfirm(false);
//                     setChatToDelete(null);
//                   }}
//                   className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition"
//                 >
//                   Delete
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {isAddFriendModalOpen && (
//         <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex justify-center items-center z-50">
//           <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
//             <h2 className="text-lg font-semibold mb-4 text-gray-800">
//               Add New Friend
//             </h2>
//             <input
//               type="text"
//               value={newFriendName}
//               onChange={(e) => setNewFriendName(e.target.value)}
//               placeholder="Enter friend's name"
//               className="w-full mb-3 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
//             />
//             <input
//               type="text"
//               value={newFriendInput}
//               onChange={(e) => setNewFriendInput(e.target.value)}
//               placeholder="Enter friend's email or name"
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
//             />
//             <div className="flex justify-end gap-3 mt-4">
//               <button
//                 onClick={() => setIsAddFriendModalOpen(false)}
//                 className="px-4 py-2 text-gray-600 hover:text-gray-800"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleAddFriendSubmit}
//                 className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
//               >
//                 Add
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//     // </Suspense>
//   );
// }
return (
    <div className="min-h-screen flex flex-col bg-[#F3EDE1] relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #F3EDE1; margin: 0; }
        .serif { font-family: 'Fraunces', serif; }

        .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; font-size:0.875rem; color:#7A7568; text-decoration:none; transition:background .15s,color .15s; }
        .nav-item:hover { background:#EDE7DA; color:#1C1F1A; }
        .nav-item.active { background:#EDE7DA; color:#1C1F1A; font-weight:500; }

        .friend-item { display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; padding:8px 10px; border-radius:7px; border:none; background:transparent; cursor:pointer; font-size:0.8rem; color:#7A7568; font-family:'DM Sans',sans-serif; transition:background .15s,color .15s; }
        .friend-item:hover { background:#EDE7DA; color:#1C1F1A; }
        .friend-item.selected { background:#EDE7DA; color:#1C1F1A; font-weight:500; }
        .friend-item.updated { transform:scale(1.02); box-shadow:0 2px 8px rgba(0,0,0,0.08); }

        .ctx-menu { background:#FDFAF5; border:1.5px solid #D6CFBF; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.1); overflow:hidden; width:148px; }
        .ctx-btn { display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px; border:none; background:transparent; font-size:0.8rem; color:#4A4540; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background .12s; text-align:left; }
        .ctx-btn:hover { background:#EDE7DA; }
        .ctx-btn.danger { color:#B94040; }
        .ctx-btn.danger:hover { background:#FCEAEA; }

        .rename-input { background:#FDFAF5; border:1.5px solid #D6CFBF; border-radius:7px; font-size:0.8rem; font-family:'DM Sans',sans-serif; color:#1C1F1A; padding:5px 10px; width:73%; }
        .rename-input:focus { outline:none; border-color:#5C6B5C; box-shadow:0 0 0 2px rgba(92,107,92,0.12); }

        .bubble-me     { background:#3A4A3A; color:#FDFAF5; border-radius:14px 14px 4px 14px; }
        .bubble-friend { background:#FDFAF5; color:#1C1F1A; border-radius:14px 14px 14px 4px; border:1px solid #E8E2D6; }

        .code-block { background:#2A2F28; color:#D4EDAC; border-radius:8px; padding:16px; overflow-x:auto; font-size:0.82rem; position:relative; margin-bottom:1rem; }
        .inline-code { background:#EDE7DA; color:#3A4A3A; padding:2px 6px; border-radius:4px; font-size:0.9em; }
        .md-table { border-collapse:collapse; min-width:500px; font-size:0.85rem; width:100%; }
        .md-table th { background:#EDE7DA; color:#1C1F1A; border:1px solid #D6CFBF; padding:8px 12px; text-align:left; font-weight:500; }
        .md-table td { border:1px solid #E8E2D6; padding:8px 12px; text-align:left; }
        .md-table tr:nth-child(even) td { background:#F7F2E8; }

        .chat-input { background:#FDFAF5; border:1.5px solid #D6CFBF; border-radius:10px; font-size:0.875rem; font-family:'DM Sans',sans-serif; color:#1C1F1A; resize:vertical; transition:border-color .15s; }
        .chat-input::placeholder { color:#C4BDB0; }
        .chat-input:focus { outline:none; border-color:#5C6B5C; box-shadow:0 0 0 3px rgba(92,107,92,0.1); }

        .mic-btn { padding:9px; border-radius:8px; border:1.5px solid #D6CFBF; background:#FDFAF5; cursor:pointer; transition:background .15s; color:#7A7568; }
        .mic-btn:hover { background:#EDE7DA; }
        .mic-btn.listening { background:#B94040; border-color:#B94040; color:#FDFAF5; }

        .send-btn { padding:9px 14px; border-radius:8px; background:#3A4A3A; color:#FDFAF5; border:none; cursor:pointer; transition:background .15s; display:flex; align-items:center; }
        .send-btn:hover { background:#1C1F1A; }
        .send-btn:disabled { opacity:.4; cursor:not-allowed; }

        .msg-action { display:inline-flex; align-items:center; gap:4px; font-size:0.7rem; color:#A09B92; background:none; border:none; cursor:pointer; padding:2px 5px; border-radius:4px; transition:color .12s,background .12s; font-family:'DM Sans',sans-serif; }
        .msg-action:hover { color:#1C1F1A; background:#EDE7DA; }
        .msg-action.danger:hover { color:#B94040; background:#FCEAEA; }

        .modal-input { width:100%; border:1.5px solid #D6CFBF; border-radius:8px; padding:8px 12px; font-size:0.875rem; font-family:'DM Sans',sans-serif; color:#1C1F1A; background:#FDFAF5; }
        .modal-input:focus { outline:none; border-color:#5C6B5C; box-shadow:0 0 0 2px rgba(92,107,92,0.1); }
        .modal-input::placeholder { color:#C4BDB0; }

        .logout-btn { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border-radius:8px; border:none; background:transparent; cursor:pointer; font-size:0.875rem; color:#A09B92; transition:background .15s,color .15s; font-family:'DM Sans',sans-serif; }
        .logout-btn:hover { background:#FCEAEA; color:#B94040; }

        .new-friend-btn { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border-radius:8px; border:1.5px solid #D6CFBF; background:#FDFAF5; cursor:pointer; font-size:0.82rem; color:#4A4540; transition:background .15s,border-color .15s; font-family:'DM Sans',sans-serif; }
        .new-friend-btn:hover { background:#EDE7DA; border-color:#7A8F6F; }

        .sidebar-overlay { position:fixed; inset:0; background:rgba(28,31,26,0.3); z-index:40; display:none; }
        .sidebar-overlay.show { display:block; }

        .thin-scroll::-webkit-scrollbar { width:4px; }
        .thin-scroll::-webkit-scrollbar-track { background:transparent; }
        .thin-scroll::-webkit-scrollbar-thumb { background:#C8C0B0; border-radius:4px; }
      `}</style>

      {/* Overlay */}
      <div className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`} onClick={() => setIsSidebarOpen(false)} />

      {/* ─── SIDEBAR ─── */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full w-60 bg-[#FDFAF5] border-r border-[#D6CFBF] z-50 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#D6CFBF] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md overflow-hidden border border-[#D6CFBF] flex-shrink-0">
              <img src="/chatterly_logo.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="serif text-[1.05rem] text-[#1C1F1A]">ChatterlyAI</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EDE7DA] transition-colors bg-transparent border-none cursor-pointer text-[#7A7568]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-3 space-y-0.5 flex-shrink-0">
          <p className="text-[0.62rem] font-medium tracking-[0.1em] uppercase text-[#C4BDB0] px-3 mb-2">Menu</p>
          <Link href="/dashboard"  className="nav-item"><LayoutDashboard size={15} /> Dashboard</Link>
          <Link href="/ask-doubt"  className="nav-item"><Lightbulb size={15} /> AI Chatbot</Link>
          <Link href="/chat"       className="nav-item active"><MessageCircleMore size={15} /> Chat with Friends</Link>
        </nav>

        {/* New friend */}
        <div className="px-3 py-2 flex-shrink-0">
          <div className="h-px bg-[#D6CFBF] mb-2" />
          <button onClick={openAddFriendModal} className="new-friend-btn">
            <UserPlus size={14} /> New Friend Chat
          </button>
          <div className="h-px bg-[#D6CFBF] mt-2" />
        </div>

        {/* Friends list */}
        <div className="thin-scroll flex-1 overflow-y-auto px-3 py-1">
          <p className="text-[0.62rem] font-medium tracking-[0.1em] uppercase text-[#C4BDB0] px-2 mb-2">Chats</p>

          <AnimatePresence>
            {friends.length === 0 && (
              <p className="text-xs text-[#C4BDB0] px-2 py-1">No previous chats</p>
            )}

            {friends.map((frnd) => (
              <div key={frnd.chatbox_id} className="relative group mb-0.5">

                {editingFriendId === frnd.chatbox_id ? (
                  <div className="px-2 py-1">
                    <input
                      type="text"
                      value={editedFriendName}
                      onChange={(e) => setEditedFriendName(e.target.value)}
                      onBlur={() => {
                        if (editedFriendName.trim() && editedFriendName !== frnd.name) handleEditChatName(frnd.chatbox_id);
                        setEditingFriendId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (editedFriendName.trim() && editedFriendName !== frnd.name) handleEditChatName(frnd.chatbox_id);
                          setEditingFriendId(null);
                        } else if (e.key === "Escape") { setEditingFriendId(null); }
                      }}
                      className="rename-input"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => handleFriendSelect(frnd)}
                    onDoubleClick={() => { setEditingFriendId(frnd.chatbox_id); setEditedFriendName(frnd.name || ""); }}
                    className={`friend-item ${selectedFriend?.chatbox_id === frnd.chatbox_id ? "selected" : ""} ${updatedChatboxId === frnd.chatbox_id ? "updated" : ""}`}
                    style={{ paddingRight: "48px" }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-[0.8rem]">
                        {frnd.name
                          ? frnd.name.length > 14 ? frnd.name.slice(0, 14) + "…" : frnd.name
                          : frnd.email}
                      </span>
                      {onlineMap[frnd.email] && (
                        <span className="w-1.5 h-1.5 bg-[#4CAF6A] rounded-full flex-shrink-0" />
                      )}
                    </span>
                  </button>
                )}

                {/* Pin + 3-dot */}
                <div className="absolute top-[22%] right-1 flex items-center gap-0.5">
                  {frnd.pinned && (
                    <span className="text-[#A09B92]" title="Pinned">
                      <TiPinOutline size={12} />
                    </span>
                  )}
                  <button
                    ref={(el) => (menuRefs.current[frnd.chatbox_id] = el)}
                    onClick={(e) => { e.preventDefault(); setMenuOpenId((prev) => prev === frnd.chatbox_id ? null : frnd.chatbox_id); }}
                    className={`p-1 rounded bg-transparent border-none cursor-pointer text-[#A09B92] transition-opacity ${menuOpenId === frnd.chatbox_id ? "opacity-100 bg-[#E8E2D6]" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    <EllipsisVertical size={14} />
                  </button>
                </div>

                {/* Dropdown */}
                <AnimatePresence>
                  {menuOpenId === frnd.chatbox_id && (
                    <motion.div
                      ref={menuRef}
                      key={frnd.chatbox_id}
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="ctx-menu absolute right-1 top-8 z-20"
                    >
                      <button onClick={() => { setEditingFriendId(frnd.chatbox_id); setEditedFriendName(frnd.name || ""); setMenuOpenId(null); }} className="ctx-btn">
                        <Edit size={13} /> Edit name
                      </button>
                      <button onClick={() => { setChatToDelete(frnd); setShowDeleteConfirm(true); setMenuOpenId(null); }} className="ctx-btn danger">
                        <Trash2 size={13} /> Delete
                      </button>
                      <button onClick={() => handlePinChatName(frnd)} className="ctx-btn">
                        <Pin size={13} /> {frnd.pinned ? "Unpin" : "Pin chat"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 pt-2 border-t border-[#D6CFBF] flex-shrink-0">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {/* ─── MAIN ─── */}
      <div className="flex flex-col flex-1 lg:ml-60">

        {/* Header */}
        <header className="bg-[#F3EDE1]/90 backdrop-blur-md border-b border-[#D6CFBF] px-5 py-3.5 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md border border-[#D6CFBF] bg-transparent cursor-pointer text-[#7A7568] hover:bg-[#EDE7DA] transition-colors"
            >
              {isSidebarOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
            <MessageCircleMore size={15} className="text-[#5C6B5C]" />
            <h1 className="serif text-[1.2rem] text-[#1C1F1A] tracking-tight">Chat with Friends</h1>
          </div>
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D6CFBF] cursor-pointer">
              {user?.image ? (
                <img src={user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#3A4A3A] flex items-center justify-center">
                  <User size={14} className="text-[#F3EDE1]" />
                </div>
              )}
            </div>
          </Link>
        </header>

        {/* ─── CHAT BODY ─── */}
        <main className="flex-1 relative overflow-hidden">
          <div className="h-full flex flex-col">

            {/* Messages */}
            <div className="thin-scroll flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4 pb-36">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full pt-20 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EDE7DA] flex items-center justify-center">
                    <MessageCircleMore size={20} className="text-[#7A7568]" />
                  </div>
                  <p className="text-sm text-[#A09B92]">Select a friend to start chatting</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.senderEmail === userEmail ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-3 break-words max-w-[80vw] md:max-w-md ${
                    msg.senderEmail === userEmail ? "bubble-me" : "bubble-friend"
                  }`}>

                    {/* Sender label */}
                    <div className={`text-[0.68rem] font-medium mb-1.5 tracking-wide ${
                      msg.senderEmail === userEmail ? "text-right text-[#FDFAF5]/60" : "text-left text-[#A09B92]"
                    }`}>
                      {msg.senderEmail === userEmail ? "You" : selectedFriend?.name || selectedFriend?.email || "Friend"}
                    </div>

                    <div className="markdown-content text-sm overflow-x-auto whitespace-pre-wrap break-words">
                      {editingIndex === idx ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-2 border border-[#D6CFBF] rounded-lg bg-[#FDFAF5] text-[#1C1F1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C6B5C]/30"
                            rows={2}
                          />
                          <div className="flex justify-end gap-3 text-xs">
                            <button onClick={confirmEditMessage} className="text-[#5C6B5C] hover:text-[#3A4A3A] font-medium bg-transparent border-none cursor-pointer">Save</button>
                            <button onClick={() => { setEditingIndex(null); setEditingText(""); }} className="text-[#A09B92] hover:text-[#1C1F1A] font-medium bg-transparent border-none cursor-pointer">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => {
                              const totalLength = (msg.text || "").length;
                              const isShort = msg.senderEmail === userEmail && totalLength <= 64;
                              return <p className={`mb-1 ${isShort ? "text-right" : ""}`}>{children}</p>;
                            },
                            a: ({ href, children }) => (
                              <a href={href} className="text-[#5C6B5C] underline underline-offset-2">{children}</a>
                            ),
                            li: ({ children }) => <li>{children}</li>,
                            code: ({ inline, children }) => {
                              const text = Array.isArray(children) ? children.join("") : String(children ?? "");
                              return inline ? (
                                <code className="inline-code">{text}</code>
                              ) : (
                                <div style={{ position: "relative", marginBottom: "1rem" }}>
                                  <pre className="code-block"><code>{text}</code></pre>
                                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: "6px" }}>
                                    <button onClick={() => handleCopy(Array.isArray(children) ? children.join("") : children)} className="msg-action" style={{ color: "#D4EDAC" }}><FaCopy /></button>
                                    <button onClick={() => sendToWhatsApp(children)} className="msg-action" style={{ color: "#4ADE80" }}><FaWhatsapp /></button>
                                    <button onClick={() => sendToGmail(children)} className="msg-action"><FaEnvelope size={12} /></button>
                                  </div>
                                </div>
                              );
                            },
                            table: ({ children }) => (
                              <div style={{ overflowX: "auto" }}>
                                <table className="md-table">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead>{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr>{children}</tr>,
                            th: ({ children }) => <th>{children}</th>,
                            td: ({ children }) => <td>{children}</td>,
                          }}
                          suppressHydrationWarning
                        >
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* Actions — own messages only */}
                    {msg.senderEmail === userEmail && (
                      <div className="flex gap-3 justify-end items-center mt-2 flex-wrap">
                        <button onClick={() => handleEditMessage(idx)}   className="msg-action"><RiEditLine size={12} /> Edit</button>
                        <button onClick={() => handleDeleteMessage(idx)} className="msg-action danger"><MdDelete size={13} /> Delete</button>
                        <button onClick={() => handleCopy(msg.text)}     className="msg-action"><FaCopy size={11} /> Copy</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <p className="text-center text-xs text-[#C4BDB0]">Sending…</p>
              )}
              {error && <div className="text-sm text-[#B94040] px-2">{error}</div>}
              <div ref={messagesEndRef} />
            </div>

            {/* ─── INPUT BAR ─── */}
            <div className="fixed bottom-0 left-0 right-0 lg:ml-60 bg-[#F3EDE1]/95 backdrop-blur-lg border-t border-[#D6CFBF] px-4 md:px-6 py-3 z-40">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                      const el = inputRef.current;
                      el.style.height = "auto";
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  className="chat-input flex-1 px-4 py-2.5 min-h-[3rem] max-h-[12rem]"
                />

                {/* Mic */}
                <button onClick={toggleListening} className={`mic-btn flex-shrink-0 ${listening ? "listening" : ""}`}>
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Listening modal */}
                {listening && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] text-center">
                    <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl shadow-xl px-6 py-8 w-[90%] max-w-sm relative flex flex-col items-center gap-4">
                      <button onClick={toggleListening} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EDE7DA] bg-transparent border-none cursor-pointer text-[#7A7568]">
                        <X size={14} />
                      </button>
                      <div className="relative mt-2">
                        <div className="absolute h-14 w-14 bg-[#5C6B5C]/30 rounded-full animate-ping" />
                        <div className="h-14 w-14 bg-[#3A4A3A] rounded-full flex items-center justify-center relative z-10">
                          <Mic size={22} className="text-[#FDFAF5]" />
                        </div>
                      </div>
                      <p className="text-sm text-[#7A7568]">Listening…</p>
                      {liveTranscript && (
                        <p className="text-sm text-[#4A4540] bg-[#F3EDE1] rounded-lg px-4 py-2 w-full text-center">{liveTranscript}</p>
                      )}
                      <button onClick={toggleListening} className="mt-2 bg-[#B94040] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#9A3333] transition cursor-pointer border-none">
                        Stop &amp; continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Send */}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="send-btn flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── DELETE CHAT MODAL ─── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            key="deleteConfirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex justify-center items-center z-50"
          >
            <motion.div
              ref={deleteModalRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl shadow-xl w-[90%] max-w-sm p-6 text-center"
            >
              <h2 className="serif text-[1.15rem] text-[#1C1F1A] mb-2">Delete chat?</h2>
              <p className="text-sm text-[#7A7568] mb-6 leading-relaxed">
                This will permanently delete the chat with{" "}
                <span className="font-medium text-[#1C1F1A]">{chatToDelete?.name || chatToDelete?.email}</span>.
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setChatToDelete(null); }}
                  className="px-4 py-2 rounded-lg border border-[#D6CFBF] bg-[#F3EDE1] text-sm text-[#4A4540] hover:bg-[#EDE7DA] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => { if (chatToDelete) await handleDeleteChatName(chatToDelete); setShowDeleteConfirm(false); setChatToDelete(null); }}
                  className="px-4 py-2 rounded-lg bg-[#B94040] text-white text-sm hover:bg-[#9A3333] transition cursor-pointer border-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ADD FRIEND MODAL ─── */}
      {isAddFriendModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex justify-center items-center z-50">
          <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl shadow-xl p-6 w-[90%] max-w-sm">
            <h2 className="serif text-[1.15rem] text-[#1C1F1A] mb-5">Add new friend</h2>
            <label className="block text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">Name</label>
            <input
              type="text"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              placeholder="Friend's name"
              className="modal-input mb-4"
            />
            <label className="block text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">Email</label>
            <input
              type="text"
              value={newFriendInput}
              onChange={(e) => setNewFriendInput(e.target.value)}
              placeholder="Friend's email"
              className="modal-input mb-5"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddFriendModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#D6CFBF] text-sm text-[#7A7568] hover:bg-[#EDE7DA] transition cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFriendSubmit}
                className="px-4 py-2 rounded-lg bg-[#3A4A3A] text-[#FDFAF5] text-sm hover:bg-[#1C1F1A] transition cursor-pointer border-none"
              >
                Add friend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}