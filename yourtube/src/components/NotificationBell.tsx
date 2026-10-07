import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Check,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  read: boolean;
  deliveryStatus: string;
  deliveryDetails: string;
  userEmail?: string;
  createdAt: string;
  metadata?: any;
}

export default function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<NotificationItem | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get("/subscription/notifications");
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err: any) {
      // Silently catch in navbar
      console.warn("Could not fetch notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await axiosInstance.post(`/subscription/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.post("/subscription/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const openEmailModal = (item: NotificationItem) => {
    setSelectedEmail(item);
    if (!item.read) {
      handleMarkAsRead(item._id);
    }
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full hover:bg-gray-100"
            title="Subscription & Email Notifications"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-80 sm:w-96 p-0 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          align="end"
          forceMount
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Plan Emails & Alerts
              </h4>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <Mail className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-700">No email notifications yet</p>
                <p className="text-[11px] text-gray-400 max-w-[220px] mx-auto">
                  Confirmation emails and cancellation notices will appear here automatically.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => openEmailModal(item)}
                  className={`p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !item.read ? "bg-red-50/40" : ""
                  }`}
                >
                  <div className="mt-0.5">
                    {item.type === "SUBSCRIPTION_PURCHASE" ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(item.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                      {item.previewText || item.subject}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                          item.deliveryStatus === "DELIVERED_SMTP"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.deliveryStatus === "DELIVERED_SMTP" ? "Delivered to Email" : "In-App Preview"}
                      </span>

                      <span className="text-[10px] font-semibold text-red-600 hover:underline">
                        View Email &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
            >
              <Info className="w-3.5 h-3.5 text-gray-400" />
              Live Email Setup Info
            </button>
            <a
              href="/subscription/dashboard"
              className="text-red-600 font-bold hover:underline"
            >
              Subscription Dashboard
            </a>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base">{selectedEmail.subject}</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Sent to: <strong>{selectedEmail.userEmail}</strong> on{" "}
                  {new Date(selectedEmail.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status notice */}
            {selectedEmail.deliveryStatus !== "DELIVERED_SMTP" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">In-App Preview Mode Active</p>
                  <p className="text-[11px] text-amber-700">
                    Live inbox delivery requires setting <code>EMAIL_USER</code> and{" "}
                    <code>EMAIL_PASSWORD</code> in your Render environment variables. The receipt above is authentic and complete.
                  </p>
                </div>
              </div>
            )}

            {/* Email HTML Frame / Sandbox */}
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-2xl bg-gray-50 p-2">
              <iframe
                title="Email Preview"
                srcDoc={selectedEmail.htmlContent}
                className="w-full h-[450px] rounded-xl border-none bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-gray-400 font-mono text-[11px]">
                ID: {selectedEmail._id}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEmail(null)}
                  className="rounded-full text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const printWin = window.open("", "_blank");
                    if (printWin) {
                      printWin.document.write(selectedEmail.htmlContent);
                      printWin.document.close();
                      printWin.print();
                    }
                  }}
                  className="rounded-full text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Print Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Configuration Guide Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-gray-900 text-base">Deliver Real Emails to Inbox</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>
                To deliver actual emails to your <strong>Gmail / Yahoo / Outlook</strong> inbox from Render, add these 2 environment variables to your <strong>Render Dashboard &rarr; Environment</strong>:
              </p>

              <div className="bg-gray-900 text-gray-100 p-3.5 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <div><span className="text-emerald-400">EMAIL_SERVICE</span>=gmail</div>
                <div><span className="text-emerald-400">EMAIL_USER</span>=your_email@gmail.com</div>
                <div><span className="text-emerald-400">EMAIL_PASSWORD</span>=your_16_digit_app_password</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1 text-emerald-900">
                <p className="font-bold">How to get a Gmail App Password (1 minute):</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-emerald-800">
                  <li>Visit <strong>myaccount.google.com/security</strong></li>
                  <li>Enable <strong>2-Step Verification</strong></li>
                  <li>Search for <strong>App passwords</strong></li>
                  <li>Create a new password labeled <em>YourTube</em> and paste the 16 characters above</li>
                </ol>
              </div>

              <p className="text-[11px] text-gray-500">
                Alternatively, you can use free providers like <strong>Brevo</strong> (300 emails/day) or <strong>Resend</strong> (<code>RESEND_API_KEY</code>).
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                size="sm"
                onClick={() => setShowConfigModal(false)}
                className="rounded-full text-xs font-bold bg-gray-900 hover:bg-black text-white"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
