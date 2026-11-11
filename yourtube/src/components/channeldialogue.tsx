import { useRouter } from "next/router";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { Sparkles, RefreshCw, ExternalLink, Camera, Edit3 } from "lucide-react";
import { toast } from "sonner";

const Channeldialogue = ({ isopen, onclose, channeldata, mode: initialMode = "create" }: any) => {
  const { user, login, updateUser } = useUser();
  const router = useRouter();

  const [dialogMode, setDialogMode] = useState<"create" | "edit">(initialMode);
  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    description: "",
    image: "",
    bannerImage: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.channelname || initialMode === "edit") {
      setDialogMode("edit");
    } else {
      setDialogMode("create");
    }

    if (channeldata && (initialMode === "edit" || user?.channelname)) {
      setFormData({
        name: channeldata.name || channeldata.channelname || user?.channelname || "",
        handle: channeldata.channelHandle || user?.channelHandle || `@${(user?.channelname || user?.name || "creator").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        description: channeldata.description || user?.description || "",
        image: channeldata.image || user?.image || "",
        bannerImage: channeldata.bannerImage || user?.bannerImage || "",
      });
    } else {
      setFormData({
        name: user?.channelname || user?.name || "",
        handle: user?.channelHandle || `@${(user?.name || "creator").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        description: user?.description || "",
        image: user?.image || "",
        bannerImage: user?.bannerImage || "",
      });
    }
  }, [channeldata, user, initialMode, isopen]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const styles = ["initials", "bottts", "avataaars", "thumbs"];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const generated = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
    setFormData((prev) => ({ ...prev, image: generated }));
    toast.success("Generated new profile avatar!");
  };

  const handlesubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a channel name.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      channelname: formData.name.trim(),
      channelHandle: formData.handle.startsWith("@") ? formData.handle.trim() : `@${formData.handle.trim()}`,
      description: formData.description.trim(),
      image: formData.image.trim() || user?.image,
      bannerImage: formData.bannerImage.trim(),
    };

    try {
      const targetId = user?._id || user?.id || "guest-user";
      const response = await axiosInstance.patch(
        `/user/update/${targetId}`,
        payload
      );

      if (typeof updateUser === "function") {
        updateUser(response?.data);
      } else if (typeof login === "function") {
        login(response?.data);
      }

      toast.success(
        dialogMode === "create"
          ? "Channel created successfully!"
          : "Channel profile updated!"
      );

      router.push(`/channel/${targetId}`);
      onclose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isopen} onOpenChange={onclose}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card border-border text-foreground transition-colors max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-full border border-border">
              <button
                type="button"
                onClick={() => setDialogMode("create")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  dialogMode === "create"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Channel
              </button>
              <button
                type="button"
                onClick={() => setDialogMode("edit")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  dialogMode === "edit"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Profile</span>
              </button>
            </div>

            <Link
              href="/channel/create"
              onClick={onclose}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <span>Full Studio</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <DialogTitle className="text-xl font-black text-foreground">
            {dialogMode === "create" ? "Create Your Channel" : "Edit Channel Profile"}
          </DialogTitle>
        </DialogHeader>

        {/* Live Mini Preview */}
        <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
          <Avatar className="w-12 h-12 border border-border shrink-0">
            <AvatarImage src={formData.image || user?.image} />
            <AvatarFallback className="font-bold bg-muted text-foreground">
              {formData.name ? formData.name[0]?.toUpperCase() : "C"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">
              {formData.name || "Channel Name"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formData.handle || "@handle"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGenerateAvatar}
            className="text-xs rounded-full h-8 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
            title="Generate Random Avatar"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Random</span>
          </Button>
        </div>

        <form onSubmit={handlesubmit} className="space-y-4 pt-2">
          {/* Channel Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-foreground">
              Channel Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Daily Tech Reviews"
              required
              className="rounded-xl bg-muted/30 border-border text-foreground"
            />
          </div>

          {/* Channel Handle */}
          <div className="space-y-1.5">
            <Label htmlFor="handle" className="text-xs font-bold text-foreground">
              Channel Handle (@username)
            </Label>
            <Input
              id="handle"
              name="handle"
              value={formData.handle}
              onChange={handleChange}
              placeholder="@techreviews"
              className="rounded-xl bg-muted/30 border-border text-foreground font-mono text-xs"
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="image" className="text-xs font-bold text-foreground">
                Profile Avatar URL
              </Label>
              <button
                type="button"
                onClick={handleGenerateAvatar}
                className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Auto-generate
              </button>
            </div>
            <Input
              id="image"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
              className="rounded-xl bg-muted/30 border-border text-foreground text-xs"
            />
          </div>

          {/* Channel Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold text-foreground">
              Channel Description / Bio
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Tell viewers what your channel is about..."
              className="rounded-xl bg-muted/30 border-border text-foreground text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onclose}
              className="rounded-full text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold px-6 shadow-sm"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
              ) : dialogMode === "create" ? (
                "Create Channel"
              ) : (
                "Save Profile Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Channeldialogue;
