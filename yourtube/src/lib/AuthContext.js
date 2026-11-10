import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pendingOtpChallenge, setPendingOtpChallenge] = useState(null);

  const login = (userdata, token, deviceToken) => {
    setUser(userdata);
    setPendingOtpChallenge(null);
    try {
      localStorage.setItem("user", JSON.stringify(userdata));
      if (token) {
        localStorage.setItem("token", token);
      }
      if (deviceToken) {
        localStorage.setItem("yt_device_token", deviceToken);
      }
    } catch (_) {}
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/user/logout");
    } catch (_) {}

    setUser(null);
    setPendingOtpChallenge(null);
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
      const deviceToken = typeof window !== "undefined" ? localStorage.getItem("yt_device_token") : null;
      const deviceId = typeof window !== "undefined" ? localStorage.getItem("yt_device_id") : null;

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName || firebaseuser.email.split("@")[0],
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        deviceToken,
        deviceId,
      };
      const response = await axiosInstance.post("/user/login", payload);

      if (response.data?.otpRequired) {
        setPendingOtpChallenge(response.data);
        return response.data;
      }

      login(response.data.result, response.data.token, response.data.deviceToken);
      return response.data;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email, name) => {
    try {
      const displayName = name || email.split("@")[0] || "User";
      const deviceToken = typeof window !== "undefined" ? localStorage.getItem("yt_device_token") : null;
      const deviceId = typeof window !== "undefined" ? localStorage.getItem("yt_device_id") : null;

      const payload = {
        email: email.trim().toLowerCase(),
        name: displayName,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          displayName
        )}`,
        deviceToken,
        deviceId,
      };
      const response = await axiosInstance.post("/user/login", payload);

      if (response.data?.otpRequired) {
        setPendingOtpChallenge(response.data);
        return response.data;
      }

      login(response.data.result, response.data.token, response.data.deviceToken);
      return response.data;
    } catch (error) {
      console.error("Email login error:", error);
      throw error;
    }
  };

  const verifyOtp = async ({ challengeId, otp, trustDevice = true, deviceName = "" }) => {
    try {
      const payload = {
        challengeId,
        otp: String(otp).trim(),
        trustDevice,
        deviceName,
      };
      const response = await axiosInstance.post("/user/verify-otp", payload);
      login(response.data.result, response.data.token, response.data.deviceToken);
      return response.data;
    } catch (error) {
      console.error("OTP verification error:", error);
      throw error;
    }
  };

  const resendOtp = async (challengeId, channel = "email") => {
    try {
      const response = await axiosInstance.post("/user/resend-otp", {
        challengeId,
        channel,
      });
      return response.data;
    } catch (error) {
      console.error("Resend OTP error:", error);
      throw error;
    }
  };

  const cancelOtp = async (challengeId) => {
    try {
      await axiosInstance.post("/user/cancel-otp", { challengeId });
    } catch (_) {}
    setPendingOtpChallenge(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        pendingOtpChallenge,
        setPendingOtpChallenge,
        login,
        logout,
        handlegooglesignin,
        loginWithEmail,
        verifyOtp,
        resendOtp,
        cancelOtp,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
