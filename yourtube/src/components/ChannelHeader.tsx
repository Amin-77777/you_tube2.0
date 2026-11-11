import React, { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Edit3, Globe, CheckCircle2 } from "lucide-react";

interface ChannelHeaderProps {
  channel: any;
  user: any;
  onEditProfile?: () => void;
}

const ChannelHeader: React.FC<ChannelHeaderProps> = ({ channel, user, onEditProfile }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isOwner =
    user &&
    channel &&
    (user._id === channel._id ||
      user.id === channel._id ||
      user._id === channel.id ||
      (user.channelname && user.channelname === channel.channelname));

  const bannerStyle = channel?.bannerImage
    ? { backgroundImage: `url(${channel.bannerImage})` }
    : undefined;

  const handle =
    channel?.channelHandle ||
    `@${(channel?.channelname || "channel").toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return (
    <div className="w-full transition-colors">
      {/* Banner */}
      <div
        style={bannerStyle}
        className={`relative h-32 sm:h-48 md:h-60 lg:h-72 w-full bg-cover bg-center overflow-hidden transition-all ${
          !channel?.bannerImage
            ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500"
            : ""
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Channel Info */}
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32 -mt-12 md:-mt-16 border-4 border-background shadow-xl ring-2 ring-border shrink-0">
            <AvatarImage
              src={channel?.image || "https://api.dicebear.com/7.x/initials/svg?seed=Channel"}
              alt={channel?.channelname || "Channel"}
            />
            <AvatarFallback className="text-2xl md:text-3xl font-black bg-muted text-foreground">
              {channel?.channelname?.[0]?.toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight">
                {channel?.channelname || "Channel"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground font-medium">
              <span className="font-mono text-foreground font-semibold">{handle}</span>
              <span>•</span>
              <span>12.4K subscribers</span>
              <span>•</span>
              <span>Videos & Shorts</span>
            </div>

            {channel?.description && (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {channel.description}
              </p>
            )}

            {channel?.socialLinks && (
              <div className="flex items-center gap-3 pt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                {channel.socialLinks.website && (
                  <a
                    href={channel.socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{channel.socialLinks.website}</span>
                  </a>
                )}
                {channel.socialLinks.twitter && (
                  <span>Twitter: {channel.socialLinks.twitter}</span>
                )}
                {channel.socialLinks.instagram && (
                  <span>IG: {channel.socialLinks.instagram}</span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Edit Profile for Owner or Subscribe for Visitors */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            {isOwner ? (
              <Link href="/channel/create?mode=edit">
                <Button
                  variant="outline"
                  className="rounded-full text-xs font-bold gap-2 border-border hover:bg-muted text-foreground shadow-sm"
                >
                  <Edit3 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>Edit Profile</span>
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => setIsSubscribed(!isSubscribed)}
                variant={isSubscribed ? "outline" : "default"}
                className={`rounded-full px-6 text-xs font-bold shadow-sm transition-all ${
                  isSubscribed
                    ? "bg-muted text-foreground border-border hover:bg-muted/80"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
