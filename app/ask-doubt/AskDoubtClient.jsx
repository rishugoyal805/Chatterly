"use client";
import FallbackLayout from "./FallbackLayout";

import { useState, useEffect, useRef } from "react";

import {
  Lightbulb,
  Menu,
  X,
  User,
  LogOut,
  Send,
  LayoutDashboard,
  MessageCircleMore,
  MessageSquareDiff,
  Share,
  Lock,
  EllipsisVertical,
  Edit,
  Trash2,
  Pin,
  Mail,
} from "lucide-react";
import { RiUnpinLine } from "react-icons/ri";
import { TiPinOutline } from "react-icons/ti";
import { Mic, MicOff } from "lucide-react";
import { MdDelete } from "react-icons/md";
import { RiEditLine } from "react-icons/ri";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, Suspense } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import remarkGfm from "remark-gfm";
import {
  FaCopy,
  FaWhatsapp,
  FaEnvelope,
  FaVolumeUp,
  FaPause,
  FaPlay,
  FaStop,
} from "react-icons/fa";
import { getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import React from "react";
import { io } from "socket.io-client";

export default function AskDoubtClient() {
  const searchParams = useSearchParams();
  const convoId = searchParams.get("convoId") || "Temporary Chat";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [user_ai_chats, setUser_ai_chats] = useState([]);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [user, setUser] = useState({ name: "", image: "" });
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatName, setNewChatName] = useState("");

  const [fullscreenImage, setFullscreenImage] = useState(null);

  const [showShare, setShowShare] = useState(false);
  const [shared, setShared] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const socket = useRef(null);
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  //text message by speaking user
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  // const searchParams = useSearchParams();
  // const convoId = searchParams.get("convoId");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const reNameRef = useRef(null);
  const router = useRouter();
  const handleCopy = (text) => navigator.clipboard.writeText(text);
  const sendToWhatsApp = (text) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  const sendToGmail = (text, recipientEmail) => {
    const subject = encodeURIComponent("ChatterlyAI");
    const body = encodeURIComponent(text);
    const to = encodeURIComponent(recipientEmail || "");
    const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&to=${to}&su=${subject}&body=${body}&tf=cm`;
    window.open(gmailUrl, "_blank");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reNameRef.current && !reNameRef.current.contains(event.target)) {
        setEditingChatId(null); // cancel editing
        setNewChatName(""); // optional: reset input value
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [reNameRef]);
  //listening ai message
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef(null);

  const menuRef = useRef(null);

  useEffect(() => {
    if (!userEmail) return;
    socket.current = io(process.env.NEXT_PUBLIC_AI_SOCKET_BACKEND_URL); // URL of socket server

    socket.current.emit("join-user", userEmail);

    // ✅ join chat room if convoId exists
    if (convoId && convoId !== "Temporary Chat") {
      socket.current.emit("join-chat", convoId);
    }

    // When a chat is shared with you
    socket.current.on("chat-shared-update", ({ chatbox }) => {
      setUser_ai_chats((prev) => {
        const exists = prev.some((chat) => chat._id === chatbox._id);
        if (exists) return prev;
        return [...prev, chatbox];
      });
    });

    socket.current.on(
      "receive-message",
      ({ chatboxId, senderEmail, text, isImg, imageUrl }) => {
        if (!text?.trim()) return;

        setMessages((prev) => [
          ...prev,
          {
            role: senderEmail === "AI" ? "bot" : "user",
            text,
            isImg: !!isImg,
            imageUrl: isImg ? imageUrl : null,
          },
        ]);
      }
    );

    return () => {
      socket.current.disconnect();
    };
  }, [userEmail, convoId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    }

    if (menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

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

  // ✅ Get email from localStorage
  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
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

  //fetchUserChats the chats for the user
  const fetchUserChats = async () => {
    try {
      const res = await fetch("/api/fetch-ai-chats");
      const data = await res.json();

      if (!res.ok) {
        console.error("Error loading chats:", data.message);
        return;
      }

      // ensure ownersCount is accessible and mapped properly
      const chats = data.chats?.map((chat) => ({
        ...chat,
        ownersCount: chat.ownersCount ?? 0, // fallback if missing
      }));
      if (chats.length === 0) {
        handleNewChat();
        return; // stop; nothing else to do
      }
      setUser_ai_chats(chats);
      // 🔥 Redirect to latest chat if no convoId is in URL
      if ((!convoId || convoId === "Temporary Chat") && chats.length > 0) {
        router.replace(`/ask-doubt?convoId=${chats[0].convoId}`);
        return; // stop further execution
      }
      // 🔥 If URL already has convoId, highlight it
      if (convoId) {
        setSelectedConvoId(convoId);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchUserChats();
  }, []);

  useEffect(() => {
    if (convoId) {
      setSelectedConvoId(convoId); // 🔥 highlight correct chat
    }
  }, [convoId, setSelectedConvoId]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;

    // very simple detection: starts with "/img" or "img:" etc
    const isImgRequest =
      text.startsWith("/img") ||
      text.startsWith("img:") ||
      text.startsWith("image:") ||
      text.startsWith("/image");

    if (isImgRequest) {
      await generateImage(text.replace(/^\/?img:?/i, "").trim());
    } else {
      await sendMessage(text);
    }

    setInput("");
  };

  const generateImage = async (prompt) => {
    if (!prompt.trim()) return;
    if (!userEmail) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❗ Please login,", isImg: false },
      ]);
      return;
    }

    // 1️⃣ Show user prompt in chat
    const userMessage = { role: "user", text: prompt, isImg: false };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    socket.current.emit("send-message", {
      roomId: convoId,
      senderEmail: userEmail,
      text: prompt,
      isImg: false,
      imageUrl: null,
    });

    setLoading(true);

    try {
      // 2️⃣ Save user message in DB
      const userRes = await fetch("/api/Save-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: userEmail,
          text: prompt,
          role: "user",
          isImg: false,
        }),
      });

      const { insertedId: userMessageId } = await userRes.json();

      // 3️⃣ Call HF API and get base64
      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const imgData = await imgRes.json();
      const base64Image = imgData.image;
      // console.log("BASE64 IMAGE:", base64Image);
      // console.log("image DATA:", imgData);

      // 5️⃣ Save AI message (backend uploads to Cloudinary)
      const aiSave = await fetch("/api/Save-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: "AI",
          text: prompt,
          role: "ai",
          isImg: true,
          image: base64Image,
        }),
      });
      // console.log("AI SAVE RESPONSE:", aiSave);

      const { insertedId: aiResponseId, imageUrl } = await aiSave.json();

      // 4️⃣ UI update using Cloudinary URL
      const aiMessage = {
        role: "bot",
        text: prompt,
        imageUrl: imageUrl,
        isImg: true,
      };
      // console.log("AI MESSAGE:", aiMessage);
      setMessages((prev) => [...prev, aiMessage]);
      // console.log("IMAGE URL:", imageUrl);
      // 🔥 FIXED socket emit → uses Cloudinary URL
      socket.current.emit("send-message", {
        roomId: convoId,
        senderEmail: "AI",
        text: prompt,
        imageUrl: imageUrl,
        isImg: true,
      });

      // 6️⃣ Link user + AI message as a pair
      await fetch("/api/add-message-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convoId,
          userMessageId,
          aiResponseId,
        }),
      });

      await fetchUserChats();
    } catch (err) {
      // console.error("IMAGE GEN ERROR:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "⚠️ Failed to generate image. Try again.",
          isImg: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!convoId || convoId === "Temporary Chat") return;

    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/get-conversation?convoId=${convoId}`);

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        // console.log(data);
        // Flatten messages for UI, always use imageUrl
        const formatted = data.messages.flatMap((pair) => [
          {
            id: pair.user?.id || null,
            text: pair.user?.text || "[Missing User Message]",
            senderName: pair.user?.senderName || "User",
            role: "user",
            isImg: pair.user?.isImg ?? false,
            imageUrl: pair.user?.imageUrl ?? null, // 🔥 fixed
          },
          {
            id: pair.ai?.id || null,
            text: pair.ai?.text || "[Missing AI Response]",
            role: "ai",
            isImg: pair.ai?.isImg ?? false,
            imageUrl: pair.ai?.imageUrl ?? null, // 🔥 fixed
          },
        ]);
        setMessages(
          formatted.length > 0
            ? formatted
            : [{ text: "Start A Conversation", role: "system", isImg: false }]
        );
      } catch (err) {
        // console.error("Failed to load conversation", err);
        setMessages([
          { text: "Start A Conversation", role: "system", isImg: false },
        ]);
      }
    };

    fetchConversation();
  }, [convoId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!userEmail) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❗ Please login" },
      ]);
      return;
    }

    // 1️⃣ Push user message to UI
    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    socket.current.emit("send-message", {
      roomId: convoId,
      senderEmail: userEmail,
      text: input,
      isImg: false,
      imageUrl: null,
    });
    setInput("");
    setLoading(true);
    setError("");

    try {
      // 2️⃣ Save user message in DB
      const userRes = await fetch("/api/Save-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: userEmail,
          text: input,
          role: "user",
          isImg: false,
          imageUrl: null,
        }),
      });

      const { insertedId: userMessageId } = await userRes.json();
      // 3️⃣ Call AI API to get response
      const aiRes = await axios.post(
        `${process.env.NEXT_PUBLIC_AGENTIC_BACKEND_URL}/chat`,
        {
          user_id: userEmail,
          message: input,
        }
      );

      // console.log("AI RESPONSE:", aiRes);
      const aiText = aiRes?.data?.response || "Unexpected response format.";
      const aiMessage = { role: "bot", text: aiText };

      // 4️⃣ Show AI response in chat
      setMessages((prev) => [...prev, aiMessage]);
      socket.current.emit("send-message", {
        roomId: convoId,
        senderEmail: "AI",
        text: aiText,
        isImg: false,
        imageUrl: null,
      });
      setLoading(false);
      // 5️⃣ Save AI response in DB
      const aiSave = await fetch("/api/Save-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: "AI",
          text: aiText,
          role: "ai",
          isImg: false,
          imageUrl: null,
        }),
      });

      const { insertedId: aiResponseId } = await aiSave.json();

      // 6️⃣ Link both messages in conversation
      await fetch("/api/add-message-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convoId,
          userMessageId,
          aiResponseId,
        }),
      });

      // 🔥 Update lastModified timestamp
      await fetch("/api/update-last-modified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convoId }),
      });

      await fetchUserChats(); // Refresh chat list to reflect any changes in chat names
    } catch (err) {
      // console.error("Error sending message:", err);
      setError("Something went wrong. Try again.");
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Server error. Please try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/create-new-chat", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setUser_ai_chats((prevChats) => {
          // Determine where to insert based on priority
          if (data.priority === "high") {
            // Insert after existing pinned chats
            const pinned = prevChats.filter((chat) => chat.priority === "high");
            const normal = prevChats.filter((chat) => chat.priority !== "high");
            return [...pinned, data, ...normal];
          } else {
            // Insert at top of normal chats (after pinned)
            const pinned = prevChats.filter((chat) => chat.priority === "high");
            const normal = prevChats.filter((chat) => chat.priority !== "high");
            return [...pinned, data, ...normal];
          }
        });
        setSelectedConvoId(data.convoId);
        router.push(`/ask-doubt?convoId=${data.convoId}`);
      } else {
        alert(data.message || "Failed to create chat");
      }
    } catch (err) {
      // console.error(err);
      alert("Something went wrong while creating chat.");
    }
  };

  const handleSendShare = async (method) => {
    if (!selectedUser) return alert("Select a user to share with.");
    // if (!shareMessage.trim()) return alert("Please enter a message to share.");
    if (selectedUser.email === userEmail) {
      alert("You cannot share chat with yourself.");
      return;
    }

    try {
      const res = await fetch("/api/share-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: selectedUser.email,
          convoId,
          message: shareMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) alert("Share failed");

      const chatUrl = `${window.location.origin}/ask-doubt?convoId=${convoId}`;
      const fullMessage = `${shareMessage.trim()}\n\nView chat: ${chatUrl}`;

      if (method === "gmail") {
        if (method === "gmail") {
          sendToGmail(fullMessage, selectedUser.email || "");
        } else if (method === "whatsapp") {
          sendToWhatsApp(fullMessage);
        }
      } else if (method === "whatsapp") {
        sendToWhatsApp(fullMessage);
      }

      // alert("Chat shared successfully!");
      setShowShare(false);
      setShared(true);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser("");
      setShareMessage("");
    } catch (err) {
      // console.error(err);
      alert(err.message || "Something went wrong");
    }
  };

  //base handling of edit message
  const handleEditMessage = (id) => {
    const msg = messages.find((m) => m.id === id); // or m._id depending on your data shape
    if (!msg) return;

    setEditingIndex(id); // Now storing the actual ID
    setEditingText(msg.text);
  };

  // 1. Duplicated sendMessage logic, renamed to resendEditedMessage
  const resendEditedMessage = async (text, editIndex) => {
    if (!text.trim()) return;

    if (!userEmail) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❗ Please login to use chat." },
      ]);
      return;
    }
    // ----------------------------------------------------
    // 0️⃣ Detect if this edit is an IMAGE request
    // ----------------------------------------------------
    const isImgRequest =
      text.startsWith("/img") ||
      text.startsWith("img:") ||
      text.startsWith("image:") ||
      text.startsWith("/image");

    const cleanPrompt = isImgRequest
      ? text.replace(/^\/?img:?/i, "").trim()
      : text.trim();

    // 1️⃣ Optimistically remove all messages below the edited one

    const index = messages.findIndex((m) => m.id === editingIndex);
    if (index === -1) return;

    // 1️⃣ Remove all messages below edited one
    setMessages((prev) => prev.slice(0, index + 1));

    // 2️⃣ Replace the edited user message in position
    const updatedUserMsg = {
      id: editingIndex,
      role: "user",
      text: cleanPrompt,
      isImg: false,
    };
    setMessages((prev) => [...prev.slice(0, index), updatedUserMsg]);
    // 3️⃣ Broadcast
    socket.current.emit("send-message", {
      roomId: convoId,
      senderEmail: userEmail,
      text,
      isImg: false,
      imageUrl: null,
    });

    setInput("");
    setLoading(true);
    setError("");

    try {
      // 🔹 Delete old messages from backend (those below current index)
      // await fetch("/api/delete-below", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     convoId,
      //     index: editIndex,
      //   }),
      // });

      // 🔹 Save updated user message
      const userRes = await fetch("/api/Save-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: userEmail,
          text: cleanPrompt,
          role: "user",
          isImg: false,
          imageUrl: null,
        }),
      });

      const { insertedId: userMessageId } = await userRes.json();

      // ----------------------------------------------------
      // 🚀 4️⃣ If IMAGE request → run the EXACT same flow as generateImage()
      // ----------------------------------------------------
      if (isImgRequest) {
        // Call your existing API
        const imgRes = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: cleanPrompt }),
        });

        const imgData = await imgRes.json();
        const base64Image = imgData.image;

        // Save AI in DB (Cloudinary upload included)
        const aiSave = await fetch("/api/Save-Message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderName: "AI",
            text: cleanPrompt,
            role: "ai",
            isImg: true,
            image: base64Image,
          }),
        });

        const { insertedId: aiResponseId, imageUrl } = await aiSave.json();

        const aiMessage = {
          role: "bot",
          text: cleanPrompt,
          imageUrl,
          isImg: true,
        };

        setMessages((prev) => [...prev, aiMessage]);

        socket.current.emit("send-message", {
          roomId: convoId,
          senderEmail: "AI",
          text: cleanPrompt,
          imageUrl,
          isImg: true,
        });

        // pair messages
        await fetch("/api/add-message-pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            convoId,
            userMessageId,
            aiResponseId,
          }),
        });

        setLoading(false);
        return; // STOP → do not run text chat logic
      }

      // 🔹 Fetch new AI response
      const aiRes = await axios.post(
        `${process.env.NEXT_PUBLIC_AGENTIC_BACKEND_URL}/chat`,
        {
          user_id: userEmail,
          message: text,
        }
      );

      const aiText = aiRes?.data?.response || "Unexpected response format.";
      const aiMessage = { role: "bot", text: aiText };

      // 3️⃣ Add AI message to UI immediately
      setMessages((prev) => [...prev, aiMessage]);
      // 🔥 Broadcast AI message to all clients
      socket.current.emit("send-message", {
        roomId: convoId,
        senderEmail: "AI",
        text: aiText,
      });

      setLoading(false);

      // 🔹 Save AI response to DB
      const aiSave = await fetch("/api/Save-Message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: "AI",
          text: aiText,
          role: "ai",
        }),
      });

      const { insertedId: aiResponseId } = await aiSave.json();

      // 🔹 Link message pair in backend
      await fetch("/api/add-message-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convoId,
          userMessageId,
          aiResponseId,
        }),
      });
    } catch (err) {
      // console.error("Error resending message:", err);
      setError("Something went wrong. Try again.");

      // 4️⃣ Show error response in UI
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Server error. Please try again later." },
      ]);
    }

    setLoading(false);
  };

  // 2. confirmEditMessage
  const confirmEditMessage = async () => {
    if (!editingText.trim()) return;

    try {
      const res = await fetch("/api/edit-ai-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: editingIndex,
          convoId,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingIndex ? { ...msg, text: editingText } : msg
          )
        );
        setEditingIndex(null);
        // Send it as a new message flow
        await resendEditedMessage(editingText);
      } else {
        alert("Edit failed: " + result.message);
      }
    } catch (err) {
      // console.error("Error editing message:", err);
      alert("Something went wrong.");
    }

    setEditingIndex(null);
    setEditingText("");
  };

  // handling the deletion of a message
  const handleDeleteMessage = async (id) => {
    setMessages((prev) => {
      const idx = prev.findIndex((msg) => msg.id === id);
      if (idx === -1) return prev;

      const idsToRemove = [id];
      if (idx + 1 < prev.length) idsToRemove.push(prev[idx + 1].id);

      return prev.filter((msg) => !idsToRemove.includes(msg.id));
    });

    try {
      await fetch("/api/delete-ai-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: id,
          convoId,
        }),
      });
      // console.log("Deleted completely");
    } catch (err) {
      // console.error("Delete failed:", err);
    }
  };

  //Inline chat rename (no prompt, no reload)
  const handleEditAiChatName = async (chat) => {
    const trimmed = newChatName?.trim();
    if (!trimmed) {
      setEditingChatId(null);
      return;
    }

    await fetch("/api/edit-ai-chat-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: chat._id, newName: trimmed }),
    });

    // Update state instantly (no reload)
    setUser_ai_chats((prev) =>
      prev.map((c) => (c._id === chat._id ? { ...c, name: trimmed } : c))
    );
    setEditingChatId(null);
  };
  // handling the deletion of an AI chat
  const handleDeleteAiChat = async (chat) => {
    // Optimistic UI update
    // setUser_ai_chats((prev) => prev.filter((c) => c._id !== chat._id));
    setMenuOpenId(null);
    setUser_ai_chats((prev) => {
      const index = prev.findIndex((c) => c._id === chat._id);
      const updated = prev.filter((c) => c._id !== chat._id);

      // 🔥 If user is deleting the currently open chat
      if (selectedConvoId === chat.convoId) {
        setMessages([]);

        // CASE 1: There is a next chat → go to it
        if (updated[index]) {
          setSelectedConvoId(updated[index].convoId);
          router.replace(`/ask-doubt?convoId=${updated[index].convoId}`);

          // CASE 2: No next chat, but there is a previous one
        } else if (updated[index - 1]) {
          setSelectedConvoId(updated[index - 1].convoId);
          router.replace(`/ask-doubt?convoId=${updated[index - 1].convoId}`);

          // CASE 3: No chats left → create a new one
        }
        //removed this because there were 2 calls to handleNewChat
        //  else {
        //   handleNewChat();
        // }
      }
      return updated;
    });

    try {
      const res = await fetch("/api/delete-ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chat._id, convoId: chat.convoId }),
      });

      if (!res.ok) throw new Error("Failed to delete chat");
    } catch (err) {
      // console.error("Delete failed:", err);
      alert("Error deleting chat. Reverting changes.");
      setUser_ai_chats((prev) => [...prev, chat]);
    }
  };

  // handling the pinning and unpining of an AI chat
  const handleTogglePinAiChat = async (chat, pin) => {
    await fetch("/api/pin-ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: chat._id, pin }), // send pin true or false
    });

    window.location.reload();
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

  const speakText = (text) => {
    if (!text) return;

    // --- CASE 1: Currently speaking & not paused → PAUSE ---
    if (speechSynthesis.speaking && !speechSynthesis.paused && isSpeaking) {
      speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    // --- CASE 2: Currently speaking & paused → RESUME ---
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // --- CASE 3: Not speaking → start NEW utterance ---
    // (Cancel any leftover old utterances)
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
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
        // Optional: redirect user
        window.location.href = "/login";
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useLayoutEffect(() => {
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

return (
    <Suspense
      fallback={
        <FallbackLayout
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      }
    >
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
          * { box-sizing: border-box; }
          body { font-family: 'DM Sans', sans-serif; background: #F3EDE1; margin: 0; }
          .serif { font-family: 'Fraunces', serif; }

          /* Sidebar nav */
          .nav-item {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 12px; border-radius: 8px;
            font-size: 0.875rem; color: #7A7568;
            text-decoration: none; transition: background .15s, color .15s;
          }
          .nav-item:hover { background: #EDE7DA; color: #1C1F1A; }
          .nav-item.active { background: #EDE7DA; color: #1C1F1A; font-weight: 500; }

          /* Chat history items */
          .chat-hist-item {
            display: block; font-size: 0.8rem;
            padding: 7px 10px; border-radius: 7px;
            color: #7A7568; text-decoration: none;
            transition: background .15s, color .15s;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            padding-right: 52px;
          }
          .chat-hist-item:hover { background: #EDE7DA; color: #1C1F1A; }
          .chat-hist-item.selected { background: #EDE7DA; color: #1C1F1A; font-weight: 500; }

          /* Sidebar overlay */
          .sidebar-overlay { position: fixed; inset: 0; background: rgba(28,31,26,0.3); z-index: 40; display: none; }
          .sidebar-overlay.show { display: block; }

          /* Chat bubbles */
          .bubble-user { background: #3A4A3A; color: #FDFAF5; border-radius: 14px 14px 4px 14px; }
          .bubble-ai   { background: #FDFAF5; color: #1C1F1A; border-radius: 14px 14px 14px 4px; border: 1px solid #E8E2D6; }

          /* Code blocks */
          .code-block { background: #2A2F28; color: #D4EDAC; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 0.82rem; position: relative; margin-bottom: 1rem; }
          .inline-code { background: #EDE7DA; color: #3A4A3A; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }

          /* Markdown tables */
          .md-table { border-collapse: collapse; min-width: 500px; font-size: 0.85rem; width: 100%; }
          .md-table th { background: #EDE7DA; color: #1C1F1A; border: 1px solid #D6CFBF; padding: 8px 12px; text-align: left; font-weight: 500; }
          .md-table td { border: 1px solid #E8E2D6; padding: 8px 12px; text-align: left; }
          .md-table tr:nth-child(even) td { background: #F7F2E8; }

          /* Input area */
          .chat-input { background: #FDFAF5; border: 1.5px solid #D6CFBF; border-radius: 10px; font-size: 0.875rem; font-family: 'DM Sans', sans-serif; color: #1C1F1A; resize: vertical; transition: border-color .15s; }
          .chat-input::placeholder { color: #C4BDB0; }
          .chat-input:focus { outline: none; border-color: #5C6B5C; box-shadow: 0 0 0 3px rgba(92,107,92,0.1); }

          /* Rename input */
          .rename-input { background: #FDFAF5; border: 1.5px solid #D6CFBF; border-radius: 7px; font-size: 0.8rem; font-family: 'DM Sans', sans-serif; color: #1C1F1A; padding: 5px 10px; max-width: 73%; }
          .rename-input:focus { outline: none; border-color: #5C6B5C; box-shadow: 0 0 0 2px rgba(92,107,92,0.12); }

          /* Dropdown */
          .ctx-menu { background: #FDFAF5; border: 1.5px solid #D6CFBF; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); overflow: hidden; width: 148px; }
          .ctx-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: transparent; font-size: 0.8rem; color: #4A4540; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background .12s; text-align: left; }
          .ctx-btn:hover { background: #EDE7DA; }
          .ctx-btn.danger { color: #B94040; }
          .ctx-btn.danger:hover { background: #FCEAEA; }

          /* Action buttons under messages */
          .msg-action { display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; color: #A09B92; background: none; border: none; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: color .12s, background .12s; font-family: 'DM Sans', sans-serif; }
          .msg-action:hover { color: #1C1F1A; background: #EDE7DA; }
          .msg-action.danger:hover { color: #B94040; background: #FCEAEA; }

          /* Logout */
          .logout-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; color: #A09B92; transition: background .15s, color .15s; font-family: 'DM Sans', sans-serif; }
          .logout-btn:hover { background: #FCEAEA; color: #B94040; }

          /* New chat btn */
          .new-chat-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border-radius: 8px; border: 1.5px solid #D6CFBF; background: #FDFAF5; cursor: pointer; font-size: 0.82rem; color: #4A4540; transition: background .15s, border-color .15s; font-family: 'DM Sans', sans-serif; }
          .new-chat-btn:hover { background: #EDE7DA; border-color: #7A8F6F; }

          /* Mic btn */
          .mic-btn { padding: 9px; border-radius: 8px; border: 1.5px solid #D6CFBF; background: #FDFAF5; cursor: pointer; transition: background .15s; color: #7A7568; }
          .mic-btn:hover { background: #EDE7DA; }
          .mic-btn.listening { background: #B94040; border-color: #B94040; color: #FDFAF5; }

          /* Send btn */
          .send-btn { padding: 9px 14px; border-radius: 8px; background: #3A4A3A; color: #FDFAF5; border: none; cursor: pointer; transition: background .15s; display: flex; align-items: center; }
          .send-btn:hover { background: #1C1F1A; }
          .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

          /* Share modal inputs */
          .modal-input { width: 100%; border: 1.5px solid #D6CFBF; border-radius: 8px; padding: 8px 12px; font-size: 0.875rem; font-family: 'DM Sans', sans-serif; color: #1C1F1A; background: #FDFAF5; }
          .modal-input:focus { outline: none; border-color: #5C6B5C; box-shadow: 0 0 0 2px rgba(92,107,92,0.1); }
          .modal-input::placeholder { color: #C4BDB0; }

          /* Scrollbar */
          .thin-scroll::-webkit-scrollbar { width: 4px; }
          .thin-scroll::-webkit-scrollbar-track { background: transparent; }
          .thin-scroll::-webkit-scrollbar-thumb { background: #C8C0B0; border-radius: 4px; }
        `}</style>

        <div className="min-h-screen flex flex-col bg-[#F3EDE1] relative">

          {/* Sidebar overlay */}
          <div
            className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* ─── SIDEBAR ─── */}
          <div
            ref={sidebarRef}
            className={`fixed left-0 top-0 h-full w-60 bg-[#FDFAF5] border-r border-[#D6CFBF] z-50 flex flex-col transition-transform duration-300 ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0`}
          >
            {/* Logo */}
            <div className="px-4 py-[16.75px] border-b border-[#D6CFBF] flex items-center justify-between flex-shrink-0">
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
              <Link href="/dashboard" className="nav-item">
                <LayoutDashboard size={15} /> Dashboard
              </Link>
              <Link href="/ask-doubt" className="nav-item active">
                <Lightbulb size={15} /> AI Chatbot
              </Link>
              <Link href="/chat" className="nav-item">
                <MessageCircleMore size={15} /> Chat with Friends
              </Link>
            </nav>

            {/* Divider + New Chat */}
            <div className="px-3 py-2 flex-shrink-0">
              <div className="h-px bg-[#D6CFBF] mb-2" />
              <button onClick={handleNewChat} className="new-chat-btn">
                <MessageSquareDiff size={14} /> New Chat
              </button>
              <div className="h-px bg-[#D6CFBF] mt-2" />
            </div>

            {/* Chat history */}
            <div className="thin-scroll flex-1 overflow-y-auto px-3 py-1">
              <p className="text-[0.62rem] font-medium tracking-[0.1em] uppercase text-[#C4BDB0] px-2 mb-2">History</p>
              {user_ai_chats.length > 0 ? (
                user_ai_chats.map((chat) => (
                  <div key={chat._id} className="relative group mb-0.5">
                    <AnimatePresence>
                      {editingChatId === chat._id ? (
                        <div ref={reNameRef} className="px-2 py-1">
                          <input
                            type="text"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") await handleEditAiChatName(chat);
                              if (e.key === "Escape") setEditingChatId(null);
                            }}
                            className="rename-input"
                            placeholder="Enter new name..."
                          />
                        </div>
                      ) : (
                        <Link
                          href={`/ask-doubt?convoId=${chat.convoId}`}
                          onClick={() => setSelectedConvoId(chat.convoId)}
                          className={`chat-hist-item ${selectedConvoId === chat.convoId ? "selected" : ""}`}
                          title={chat.name || "New Chat"}
                        >
                          {chat.name || "New Chat"}
                        </Link>
                      )}
                    </AnimatePresence>

                    {chat.priority === "high" && (
                      <div className="absolute top-[30%] right-7 text-[#A09B92]" title="Pinned">
                        <TiPinOutline size={13} fill="currentColor" />
                      </div>
                    )}

                    {/* 3-dot menu */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpenId((prev) => prev === chat._id ? null : chat._id);
                      }}
                      className="absolute top-[20%] right-1 p-1 rounded hover:bg-[#E8E2D6] bg-transparent border-none cursor-pointer text-[#A09B92] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <EllipsisVertical size={14} />
                    </button>

                    {menuOpenId === chat._id && (
                      <div ref={menuRef} className="ctx-menu absolute right-1 top-7 z-10">
                        <button
                          onClick={() => { setEditingChatId(chat._id); setNewChatName(chat.name || ""); setMenuOpenId(null); }}
                          className="ctx-btn"
                        >
                          <Edit size={13} /> Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatToDelete(chat)}
                          className="ctx-btn danger"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                        {chat.priority === "high" ? (
                          <button onClick={() => handleTogglePinAiChat(chat, false)} className="ctx-btn">
                            <RiUnpinLine size={15} /> Unpin
                          </button>
                        ) : (
                          <button onClick={() => handleTogglePinAiChat(chat, true)} className="ctx-btn">
                            <Pin size={13} /> Pin to top
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#C4BDB0] px-2 py-1">No previous chats</p>
              )}
            </div>

            {/* Logout */}
            <div className="px-3 pb-4 pt-2 border-t border-[#D6CFBF] flex-shrink-0">
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={15} /> Logout
              </button>
            </div>
          </div>

          {/* ─── DELETE CHAT MODAL ─── */}
          <AnimatePresence>
            {chatToDelete && (
              <motion.div
                key="deleteConfirmAi"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex justify-center items-center z-[999]"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-[#FDFAF5] rounded-xl border border-[#D6CFBF] shadow-xl w-[90%] max-w-sm p-6 text-center"
                >
                  <h2 className="serif text-[1.15rem] text-[#1C1F1A] mb-2">Delete this chat?</h2>
                  <p className="text-sm text-[#7A7568] mb-6 leading-relaxed">This will permanently delete the chat and all related data.</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setChatToDelete(null)}
                      className="px-4 py-2 rounded-lg border border-[#D6CFBF] bg-[#F3EDE1] text-sm text-[#4A4540] hover:bg-[#EDE7DA] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { handleDeleteAiChat(chatToDelete); setChatToDelete(null); }}
                      className="px-4 py-2 rounded-lg bg-[#B94040] text-white text-sm hover:bg-[#9A3333] transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <Lightbulb size={15} className="text-[#5C6B5C]" />
                <h1 className="serif text-[1.2rem] text-[#1C1F1A] tracking-tight">AI Chatbot</h1>
              </div>

              <div className="flex items-center gap-2">
                {convoId != "Temporary Chat" && (
                  <button
                    onClick={() => setShowShare(true)}
                    className="flex items-center gap-1.5 border border-[#D6CFBF] rounded-lg px-3 py-1.5 text-sm text-[#7A7568] hover:bg-[#EDE7DA] transition-colors bg-transparent cursor-pointer"
                  >
                    <Share size={14} />
                    <span className="hidden sm:inline text-sm">Share</span>
                  </button>
                )}
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
              </div>
            </header>

            {/* ─── SHARE MODAL ─── */}
            {showShare && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl shadow-xl p-6 w-[90%] max-w-md relative">
                  <h2 className="serif text-[1.15rem] text-[#1C1F1A] mb-5">Share this Chat</h2>
                  <button
                    onClick={() => setShowShare(false)}
                    className="absolute top-5 right-4 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EDE7DA] bg-transparent border-none cursor-pointer text-[#7A7568]"
                  >
                    <X size={15} />
                  </button>

                  <label className="block text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">Add people</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser({ email: e.target.value }); }}
                    placeholder="Enter email"
                    className="modal-input mb-4"
                  />

                  <label className="block text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">Message</label>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Add a message…"
                    className="modal-input mb-4"
                    rows={3}
                    style={{ resize: "vertical" }}
                  />

                  <div className="flex items-center gap-2 text-xs text-[#A09B92] mb-5 bg-[#F3EDE1] border border-[#D6CFBF] rounded-lg px-3 py-2">
                    <Lock size={12} />
                    Restricted — only people with access can open via link
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendShare("gmail")}
                      className="flex items-center gap-1.5 text-sm bg-[#3A4A3A] text-[#FDFAF5] px-3 py-2 rounded-lg hover:bg-[#1C1F1A] transition cursor-pointer border-none"
                    >
                      <img src="/gmail.png" alt="Gmail" className="w-4 h-4" /> Gmail
                    </button>
                    <button
                      onClick={() => handleSendShare("whatsapp")}
                      className="flex items-center gap-1.5 text-sm bg-[#2A6B3A] text-white px-3 py-2 rounded-lg hover:bg-[#1E5229] transition cursor-pointer border-none"
                    >
                      <FaWhatsapp size={14} /> WhatsApp
                    </button>
                    <button
                      onClick={() => handleSendShare("ChatterlyAI")}
                      className="flex items-center gap-1.5 text-sm bg-[#FDFAF5] border border-[#D6CFBF] text-[#1C1F1A] px-3 py-2 rounded-lg hover:bg-[#EDE7DA] transition cursor-pointer"
                    >
                      <img src="/chatterly_logo.png" alt="ChatterlyAI" className="w-4 h-4 rounded" /> Send
                    </button>
                    <button
                      onClick={() => setShowShare(false)}
                      className="flex items-center gap-1.5 text-sm bg-transparent border border-[#D6CFBF] text-[#7A7568] px-3 py-2 rounded-lg hover:bg-[#EDE7DA] transition cursor-pointer ml-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── SHARED CONFIRMATION ─── */}
            {shared && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
                <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl shadow-xl p-6 max-w-sm w-full text-center flex flex-col items-center gap-4">
                  <p className="serif text-[1.3rem] text-[#1C1F1A]">Chat shared!</p>
                  <video src="/confirmation1.mp4" autoPlay loop muted className="w-44 h-44 object-cover rounded-xl" />
                  <button
                    onClick={() => setShared(false)}
                    className="bg-[#3A4A3A] text-[#FDFAF5] px-7 py-2.5 rounded-lg text-sm hover:bg-[#1C1F1A] transition cursor-pointer border-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* ─── CHAT BODY ─── */}
            <main className="flex-1 relative overflow-x-hidden">
              <div className="h-full flex flex-col">

                {/* Messages */}
                <div className="thin-scroll flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4 pb-36">
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`px-4 py-3 break-words ${
                        msg.role === "user"
                          ? "bubble-user max-w-[70%] sm:max-w-md"
                          : "bubble-ai max-w-[90%] sm:max-w-2xl overflow-x-auto"
                      }`}>

                        {/* Sender label */}
                        <div className={`text-[0.68rem] font-medium mb-1.5 tracking-wide ${
                          msg.role === "user" ? "text-right text-[#FDFAF5]/60" : "text-left text-[#A09B92]"
                        }`}>
                          {msg.role === "user" ? msg.senderName : "ChatterlyAI"}
                        </div>

                        <div className="markdown-content text-sm overflow-x-hidden">
                          <div className="min-w-full">
                            {editingIndex === (msg.id ?? index) ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full p-2 border border-[#D6CFBF] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#5C6B5C]/30 bg-[#FDFAF5] text-[#1C1F1A] text-sm"
                                  rows={2}
                                />
                                <div className="flex justify-end gap-3 text-xs">
                                  <button onClick={confirmEditMessage} className="text-[#5C6B5C] hover:text-[#3A4A3A] font-medium bg-transparent border-none cursor-pointer">Send</button>
                                  <button onClick={() => { setEditingIndex(null); setEditingText(""); }} className="text-[#A09B92] hover:text-[#1C1F1A] font-medium bg-transparent border-none cursor-pointer">Cancel</button>
                                </div>
                              </div>
                            ) : msg.isImg ? (
                              <div className={`max-w-xs bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl p-2 flex flex-col gap-2 ${msg.role === "user" ? "self-end" : "self-start"}`}>
                                <img
                                  src={msg.imageUrl}
                                  alt="Generated"
                                  className="w-full h-auto rounded-lg object-cover cursor-pointer"
                                  onClick={() => setFullscreenImage(msg.imageUrl)}
                                />
                                <div className="flex items-center justify-between px-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(msg.imageUrl);
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url; a.download = "generated.png"; a.click();
                                        window.URL.revokeObjectURL(url);
                                      } catch (err) { console.error("Download failed", err); }
                                    }}
                                    className="msg-action text-[#5C6B5C]"
                                  >
                                    Download
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => {
                                    const totalLength = (msg.text || "").length;
                                    const isShort = msg.role === "user" && totalLength <= 64;
                                    return <p className={`mb-1 ${isShort ? "text-right" : ""}`}>{children}</p>;
                                  },
                                  img: ({ src, alt }) => (
                                    <img src={src} alt={alt} className="rounded-lg max-w-full h-auto" />
                                  ),
                                  a: ({ href, children }) => (
                                    <a href={href} className="text-[#5C6B5C] underline underline-offset-2">{children}</a>
                                  ),
                                  li: ({ children }) => <li>{children}</li>,
                                  code: ({ inline, children, className }) => {
                                    const text = Array.isArray(children) ? children.join("") : String(children);
                                    const isInlineFenced = !inline && !className && !text.includes("\n");
                                    if (inline || isInlineFenced) {
                                      return <code className="inline-code">{text}</code>;
                                    }
                                    return (
                                      <div style={{ position: "relative", marginBottom: "1rem" }}>
                                        <pre className="code-block"><code>{text}</code></pre>
                                        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: "6px" }}>
                                          <button onClick={() => handleCopy(text)} title="Copy" className="msg-action" style={{ color: "#D4EDAC" }}><FaCopy /></button>
                                          <button onClick={() => sendToWhatsApp(text)} title="WhatsApp" className="msg-action" style={{ color: "#4ADE80" }}><FaWhatsapp /></button>
                                          <button onClick={() => sendToGmail(text)} title="Gmail" className="msg-action">
                                            <img src="/gmail.png" alt="Gmail" style={{ width: 14, height: 14 }} />
                                          </button>
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
                                supresshydration
                              >
                                {msg.text}
                              </ReactMarkdown>
                            )}

                            {fullscreenImage && (
                              <div
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
                                onClick={() => setFullscreenImage(null)}
                              >
                                <img src={fullscreenImage} className="max-w-[90%] max-h-[90%] rounded-xl shadow-2xl" />
                              </div>
                            )}
                          </div>

                          {/* Message actions */}
                          {msg.text && (
                            <div className={`flex gap-3 items-center mt-2 flex-wrap ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              {msg.role === "user" && (
                                <>
                                  <button onClick={() => handleCopy(msg.text)} className="msg-action"><FaCopy size={11} /> Copy</button>
                                  <button onClick={() => handleEditMessage(msg.id)} className="msg-action"><RiEditLine size={12} /> Edit</button>
                                  <button onClick={() => setConfirmDelete({ show: true, id: msg.id })} className="msg-action danger"><MdDelete size={13} /> Delete</button>
                                </>
                              )}
                              {msg.role !== "user" && !msg.isImg && (
                                <>
                                  <button onClick={() => handleCopy(msg.text)} className="msg-action"><FaCopy size={11} /> Copy</button>
                                  <button onClick={() => sendToWhatsApp(msg.text)} className="msg-action" style={{ color: "#2A6B3A" }}><FaWhatsapp size={12} /> WhatsApp</button>
                                  <button onClick={() => sendToGmail(msg.text)} className="msg-action">
                                    <img src="/gmail.png" alt="Gmail" style={{ width: 12, height: 12 }} /> Gmail
                                  </button>
                                  <button onClick={() => speakText(msg.text)} className="msg-action" style={{ color: "#5C6B5C" }}>
                                    {isSpeaking ? (isPaused ? <FaPlay size={11} /> : <FaPause size={11} />) : <FaVolumeUp size={11} />}
                                    {isPaused ? " Resume" : isSpeaking ? " Pause" : " Play"}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bubble-ai px-4 py-2.5 text-sm text-[#A09B92] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B5C] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B5C] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B5C] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
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
                          handleSubmit();
                          const el = inputRef.current;
                          el.style.height = "auto";
                        }
                      }}
                      placeholder="Type a message… use /img to generate images"
                      rows={2}
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
                    <button onClick={handleSubmit} disabled={loading} className="send-btn flex-shrink-0">
                      <Send size={16} />
                    </button>
                  </div>
                  <p className="text-[0.68rem] text-[#C4BDB0] text-center mt-1.5">
                    ChatterlyAI can make mistakes. Check important info.
                  </p>
                </div>
              </div>

              {/* ─── DELETE MESSAGE MODAL ─── */}
              {confirmDelete.show && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-50">
                  <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl shadow-xl p-5 w-[90%] max-w-sm">
                    <h2 className="serif text-[1.1rem] text-[#1C1F1A] mb-2">Delete this message?</h2>
                    <p className="text-sm text-[#7A7568] mb-5 leading-relaxed">This will permanently remove the message and its AI response.</p>
                    <div className="flex justify-end gap-2 text-sm">
                      <button
                        onClick={() => setConfirmDelete({ show: false, id: null })}
                        className="px-4 py-2 rounded-lg border border-[#D6CFBF] text-[#4A4540] hover:bg-[#EDE7DA] transition cursor-pointer bg-transparent"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleDeleteMessage(confirmDelete.id); setConfirmDelete({ show: false, id: null }); }}
                        className="px-4 py-2 rounded-lg bg-[#B94040] text-white hover:bg-[#9A3333] transition cursor-pointer border-none"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </>
    </Suspense>
  );
}