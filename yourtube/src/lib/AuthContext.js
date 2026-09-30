import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userdata, token) => {
    setUser(userdata);
    try {
      localStorage.setItem("user", JSON.stringify(userdata));
      if (token) {
        localStorage.setItem("token", token);
      }
    } catch (_) {}
  };

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch (_) {}
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  // Restore stored session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName || firebaseuser.email.split("@")[0],
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result, response.data.token);
      return response.data;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email, name) => {
    try {
      const displayName = name || email.split("@")[0] || "User";
      const payload = {
        email: email.trim().toLowerCase(),
        name: displayName,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result, response.data.token);
      return response.data;
    } catch (error) {
      console.error("Email login error:", error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result, response.data.token);
        } catch (error) {
          console.error("Auth sync error:", error);
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider
      value={{ user, login, logout, handlegooglesignin, loginWithEmail }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
