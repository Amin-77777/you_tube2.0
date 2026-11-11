import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  User,
  Tv,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Upload,
  Globe,
  Share2,
  ExternalLink,
  Edit3,
  RefreshCw,
  Camera,
  Layers,
  Palette,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const BANNER_PRESETS = [
  {
    name: "Crimson Blaze",
    value:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&auto=format&fit=crop&q=80",
    gradient: "from-red-600 via-rose-500 to-amber-500",
  },
  {
    name: "Cyber Neon",
    value:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80",
    gradient: "from-purple-600 via-indigo-600 to-blue-500",
  },
  {
    name: "Midnight Ocean",
    value:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80",
    gradient: "from-blue-700 via-cyan-600 to-teal-500",
  },
  {
    name: "Dark Minimal",
    value:
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80",
    gradient: "from-gray-900 via-slate-800 to-neutral-900",
  },
];

export default function CreateOrEditChannelPage() {
  const router = useRouter();
  const { user, login, updateUser } = useUser();
  const { mode: initialMode } = router.query;

  const [activeTab, setActiveTab] = useState<"create" | "edit">("create");
  const [channelName, setChannelName] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Initialize data from current user
  useEffect(() => {
    if (user) {
      const hasExistingChannel = Boolean(user.channelname);
      if (initialMode === "edit" || hasExistingChannel) {
        setActiveTab("edit");
      } else {
        setActiveTab("create");
      }

      setChannelName(user.channelname || user.name || "");
      setChannelHandle(
        user.channelHandle ||
          `@${(user.channelname || user.name || "creator")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")}`
      );
      setDescription(user.description || "");
      setAvatarUrl(user.image || "");
      setBannerUrl(user.bannerImage || BANNER_PRESETS[0].value);
      if (user.socialLinks) {
        setWebsite(user.socialLinks.website || "");
        setTwitter(user.socialLinks.twitter || "");
        setInstagram(user.socialLinks.instagram || "");
      }
    }
  }, [user, initialMode]);

  // Handle local avatar file upload
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar image must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        setAvatarUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle local banner file upload
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("Banner image must be under 8MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setBannerPreview(base64);
        setBannerUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate a random avatar style
  const handleGenerateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const styles = ["initials", "bottts", "avataaars", "thumbs", "personas"];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const generated = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
    setAvatarUrl(generated);
    setAvatarPreview(null);
    toast.success("Generated fresh avatar!");
  };

  // Form submit (create or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      toast.error("Please enter a valid channel name.");
      return;
    }

    const formattedHandle = channelHandle.startsWith("@")
      ? channelHandle.trim()
      : `@${channelHandle.trim().replace(/^@+/, "")}`;

    const payload = {
      channelname: channelName.trim(),
      channelHandle: formattedHandle,
      description: description.trim(),
      image: avatarUrl.trim() || user?.image,
      bannerImage: bannerUrl.trim(),
      socialLinks: {
        website: website.trim(),
        twitter: twitter.trim(),
        instagram: instagram.trim(),
      },
    };

    try {
      setIsSubmitting(true);
      const targetId = user?._id || user?.id || "guest-user";
      const res = await axiosInstance.patch(`/user/update/${targetId}`, payload);

      if (res.data) {
        // Update local session
        if (typeof updateUser === "function") {
          updateUser(res.data);
        } else if (typeof login === "function") {
          login(res.data);
        }

        toast.success(
          activeTab === "create"
            ? "Channel created successfully! Welcome to YourTube Creators."
            : "Channel profile updated successfully!"
        );

        // Redirect to channel page
        const redirectId = res.data._id || user?._id || targetId;
        router.push(`/channel/${redirectId}`);
      }
    } catch (err: any) {
      console.error("Failed to update channel profile:", err);
      toast.error(err.response?.data?.message || "Failed to save channel profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveAvatar = avatarPreview || avatarUrl || user?.image || "https://api.dicebear.com/7.x/initials/svg?seed=Channel";
  const effectiveBanner = bannerPreview || bannerUrl || BANNER_PRESETS[0].value;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-10 transition-colors">
      <Head>
        <title>
          {activeTab === "create" ? "Create Channel" : "Edit Channel Profile"} - YourTube
        </title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={user?.channelname ? `/channel/${user._id || user.id}` : "/"}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{user?.channelname ? "Back to Channel" : "Back to Home"}</span>
          </Link>

          {user?.channelname && (
            <Link href={`/channel/${user._id || user.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold gap-1.5 border-border hover:bg-muted"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Live Channel</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Tab Mode Switcher: Create vs Edit Profile */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Creator Studio</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {activeTab === "create" ? "Create Your Channel" : "Edit Channel Profile"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {activeTab === "create"
                  ? "Launch your creator presence on YourTube. Customize your channel profile and branding."
                  : "Modify your channel profile, change banner & avatar images, handle, and contact information."}
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex items-center p-1 bg-muted rounded-full border border-border self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "create"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Channel
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "edit"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Real-Time Live Preview Header Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-red-600" />
                Live Channel Preview
              </span>
              <span className="text-[11px] text-muted-foreground">
                Updates in real-time as you edit below
              </span>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm transition-colors">
              {/* Banner Preview */}
              <div
                className="relative h-28 sm:h-40 md:h-48 w-full bg-cover bg-center transition-all duration-300"
                style={{ backgroundImage: `url(${effectiveBanner})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-mono">
                  Channel Banner
                </div>
              </div>

              {/* Channel Info Bar */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 -mt-10 sm:-mt-12 border-4 border-card shadow-lg ring-2 ring-border shrink-0">
                  <AvatarImage src={effectiveAvatar} alt="Channel Avatar" />
                  <AvatarFallback className="text-xl font-bold bg-muted text-foreground">
                    {channelName ? channelName[0]?.toUpperCase() : "C"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground truncate">
                      {channelName || "Your Channel Name"}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Official
                    </span>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">
                    {channelHandle || "@creatorhandle"} • 0 subscribers • 0 videos
                  </p>

                  <p className="text-xs text-foreground/80 line-clamp-2 pt-0.5">
                    {description || "No channel description provided yet. Tell viewers what you create!"}
                  </p>

                  {(website || twitter || instagram) && (
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                      {website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {website}</span>}
                      {twitter && <span>@{twitter.replace("@", "")}</span>}
                      {instagram && <span>IG: @{instagram.replace("@", "")}</span>}
                    </div>
                  )}
                </div>

                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 text-xs font-bold pointer-events-none self-end sm:self-center">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* 1. Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="channelName" className="text-xs font-bold text-foreground">
                  Channel Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="channelName"
                  value={channelName}
                  onChange={(e) => {
                    setChannelName(e.target.value);
                    if (!channelHandle || channelHandle === "@") {
                      setChannelHandle(`@${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
                    }
                  }}
                  placeholder="e.g., Code & Coffee with Alex"
                  required
                  className="rounded-xl bg-muted/40 border-border text-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Choose a unique name that represents you and your content.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelHandle" className="text-xs font-bold text-foreground">
                  Channel Handle (@username)
                </Label>
                <Input
                  id="channelHandle"
                  value={channelHandle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChannelHandle(val.startsWith("@") ? val : `@${val}`);
                  }}
                  placeholder="@yourchannel"
                  className="rounded-xl bg-muted/40 border-border text-foreground font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Your public handle URL: yourtube.com/{channelHandle || "@handle"}
                </p>
              </div>
            </div>

            {/* 2. Channel Bio & Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs font-bold text-foreground">
                  Channel Description / Bio
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {description.length} / 1000 characters
                </span>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Describe your channel, topics, upload schedule, and what viewers can look forward to..."
                className="rounded-xl bg-muted/40 border-border text-foreground resize-y"
              />
            </div>

            {/* 3. Avatar / Profile Picture Customization */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-red-600" />
                    Channel Profile Picture (Avatar)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a custom image, paste a picture URL, or generate an avatar.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateRandomAvatar}
                  className="rounded-full text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                  Generate New Avatar
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-border shadow-sm shrink-0">
                  <AvatarImage src={effectiveAvatar} alt="Avatar" />
                  <AvatarFallback className="font-bold text-lg bg-muted text-foreground">
                    {channelName ? channelName[0]?.toUpperCase() : "A"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 w-full space-y-2">
                  <Input
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarPreview(null);
                    }}
                    placeholder="https://example.com/my-photo.jpg"
                    className="rounded-xl bg-muted/50 border-border text-xs text-foreground"
                  />
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileUpload}
                      />
                    </label>
                    {avatarPreview && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Local file selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Banner Image Customization */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-amber-500" />
                  Channel Banner Image
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Pick a stylish preset gradient, paste an image link, or upload your artwork.
                </p>
              </div>

              {/* Preset Gradients */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBannerUrl(preset.value);
                      setBannerPreview(null);
                    }}
                    className={`relative h-14 rounded-xl overflow-hidden border transition-all text-left p-2 flex flex-col justify-end bg-gradient-to-r ${preset.gradient} ${
                      bannerUrl === preset.value
                        ? "border-red-600 ring-2 ring-red-600/40 scale-[1.02]"
                        : "border-border hover:opacity-90"
                    }`}
                  >
                    <span className="text-[10px] font-black text-white drop-shadow">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Input
                  value={bannerUrl}
                  onChange={(e) => {
                    setBannerUrl(e.target.value);
                    setBannerPreview(null);
                  }}
                  placeholder="https://example.com/my-banner.jpg"
                  className="rounded-xl bg-muted/50 border-border text-xs text-foreground"
                />
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom Banner File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* 5. Social & Web Links */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-blue-500" />
                Social & Contact Links
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-semibold text-muted-foreground">
                    Website / Portfolio
                  </Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://mywebsite.com"
                    className="rounded-xl bg-muted/40 border-border text-xs text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="twitter" className="text-xs font-semibold text-muted-foreground">
                    Twitter / X
                  </Label>
                  <Input
                    id="twitter"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@handle"
                    className="rounded-xl bg-muted/40 border-border text-xs text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instagram" className="text-xs font-semibold text-muted-foreground">
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@handle"
                    className="rounded-xl bg-muted/40 border-border text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Submit & Cancel Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <Link href={user?.channelname ? `/channel/${user._id || user.id}` : "/"}>
                <Button type="button" variant="ghost" className="rounded-full text-xs font-semibold">
                  Cancel
                </Button>
              </Link>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-2.5 text-xs font-bold shadow-md shadow-red-600/20"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : activeTab === "create" ? (
                    "Create Channel"
                  ) : (
                    "Save Profile Changes"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
