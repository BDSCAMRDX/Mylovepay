// Frontend: React.js with Firebase Image Upload + Profile + Comment + Follow + Followers/Following Count + Followed User Posts

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

const API = 'http://localhost:5000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [followedPosts, setFollowedPosts] = useState([]); // New state for followed users' posts

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const register = async () => {
    await axios.post(`${API}/register`, form);
    alert('Registered! Now login.');
    setView('login');
  };

  const login = async () => {
    const res = await axios.post(`${API}/login`, form);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setView('dashboard');
    fetchDashboard();
    fetchProfile();
    fetchUsers();
  };

  const fetchDashboard = async () => {
    const res1 = await axios.get(`${API}/earnings`, { headers: { Authorization: token } });
    setEarnings(res1.data.earnings);
    const res2 = await axios.get(`${API}/posts/all`, { headers: { Authorization: token } });
    setPosts(res2.data);
  };

  const fetchProfile = async () => {
    const res = await axios.get(`${API}/me`, { headers: { Authorization: token } });
    setProfile(res.data);
    fetchFollowedPosts(res.data.following);  // Fetch posts from followed users
  };

  const fetchUsers = async () => {
    const res = await axios.get(`${API}/users`, { headers: { Authorization: token } });
    setUsers(res.data);
  };

  const fetchFollowedPosts = async (following) => {
    const res = await axios.get(`${API}/posts/followed`, { 
      headers: { Authorization: token },
      params: { userIds: following.join(',') } // Assuming following is an array of userIds
    });
    setFollowedPosts(res.data);
  };

  const followUser = async (id) => {
    await axios.post(`${API}/follow/${id}`, {}, { headers: { Authorization: token } });
    fetchUsers();
  };

  const uploadImageToFirebase = async (file) => {
    const imageRef = ref(storage, `images/${file.name + Date.now()}`);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    return url;
  };

  const createPost = async () => {
    let imageUrl = '';
    if (imageFile) {
      imageUrl = await uploadImageToFirebase(imageFile);
    }
    await axios.post(`${API}/posts`, { content, imageUrl }, { headers: { Authorization: token } });
    alert('Post created!');
    setContent('');
    setImageFile(null);
    fetchDashboard();
  };

  const likePost = async (id) => {
    await axios.post(`${API}/posts/${id}/like`, {}, { headers: { Authorization: token } });
    fetchDashboard();
  };

  const addComment = async (postId) => {
    const comment = commentInputs[postId];
    if (!comment) return;
    await axios.post(`${API}/posts/${postId}/comment`, { comment }, { headers: { Authorization: token } });
    setCommentInputs({ ...commentInputs, [postId]: '' });
    fetchDashboard();
  };

  useEffect(() => {
    if (token) {
      setView('dashboard');
      fetchDashboard();
      fetchProfile();
      fetchUsers();
    }
  }, [token]);

  return (
    <div className="p-4 max-w-xl mx-auto">
      {view === 'login' || view === 'register' ? (
        <div className="space-y-3">
          {view === 'register' && (
            <input name="name" placeholder="Name" className="w-full p-2 border" onChange={handleChange} />
          )}
          <input name="email" placeholder="Email" className="w-full p-2 border" onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" className="w-full p-2 border" onChange={handleChange} />
          <button onClick={view === 'login' ? login : register} className="bg-blue-500 text-white px-4 py-2 rounded">
            {view === 'login' ? 'Login' : 'Register'}
          </button>
          <p onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm cursor-pointer text-blue-600">
            {view === 'login' ? 'Create account' : 'Have an account? Login'}
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-2">Dashboard</h2>
          <p>Total Earnings: ${earnings.toFixed(2)}</p>

          {profile && (
            <div className="border p-3 mt-4 mb-6 rounded bg-gray-50">
              <h4 className="font-semibold">👤 Profile</h4>
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Followers:</strong> {profile.followers.length}</p>
              <p><strong>Following:</strong> {profile.following.length}</p>
              <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          )}

          <div className="border p-3 rounded mb-6">
            <h4 className="font-semibold mb-2">🔗 Users You Can Follow</h4>
            {users.map(user => (
              user._id !== profile?._id && (
                <div key={user._id} className="flex justify-between items-center mb-1">
                  <span>{user.name}</span>
                  <button onClick={() => followUser(user._id)} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Follow</button>
                </div>
              )
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold mb-2">Followed Users' Posts</h3>
            {followedPosts.map(post => (
              <div key={post._id} className="border p-3 mb-3 rounded">
                <p>{post.content}</p>
                {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full h-auto mt-2" />}
                <div className="flex items-center justify-between mt-2">
                  <span>❤️ {post.likes}</span>
                  <button onClick={() => likePost(post._id)} className="bg-blue-400 text-white px-2 py-1 rounded">Like</button>
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Write a comment"
                    value={commentInputs[post._id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                    className="w-full p-2 border mt-2"
                  />
                  <button
                    onClick={() => addComment(post._id)}
                    className="bg-purple-500 text-white px-3 py-1 mt-1 rounded"
                  >
                    Comment
                  </button>
                  {post.comments && post.comments.map((c, idx) => (
                    <p key={idx} className="text-sm mt-1 text-gray-700 border-t pt-1">💬 {c.comment}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold mb-2">All Posts</h3>
            {posts.map(post => (
              <div key={post._id} className="border p-3 mb-3 rounded">
                <p>{post.content}</p>
                {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full h-auto mt-2" />}
                <div className="flex items-center justify-between mt-2">
                  <span>❤️ {post.likes}</span>
                  <button onClick={() => likePost(post._id)} className="bg-blue-400 text-white px-2 py-1 rounded">Like</button>
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Write a comment"
                    value={commentInputs[post._id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                    className="w-full p-2 border mt-2"
                  />
                  <button
                    onClick={() => addComment(post._id)}
                    className="bg-purple-500 text-white px-3 py-1 mt-1 rounded"
                  >
                    Comment
                  </button>
                  {post.comments && post.comments.map((c, idx) => (
                    <p key={idx} className="text-sm mt-1 text-gray-700 border-t pt-1">💬 {c.comment}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
