/**
 * Device and User-Agent parser service
 * Privacy-conscious, reliable heuristic parser for browser, OS, and device type.
 */

export function parseUserAgent(uaString = "") {
  const ua = (uaString || "").trim();

  let browserName = "Other";
  let browserVersion = "";
  let browserFamily = "Other";

  let osName = "Unknown";
  let osVersion = "";

  let deviceType = "Desktop";
  let deviceModel = "";

  if (!ua) {
    return {
      browser: { name: "Unknown", version: "", family: "Unknown" },
      os: { name: "Unknown", version: "" },
      device: { type: "Unknown", model: "", name: "Unknown Device" },
      userAgent: "",
    };
  }

  // --- Detect OS ---
  if (/windows phone/i.test(ua)) {
    osName = "Windows Phone";
    deviceType = "Mobile";
  } else if (/win(dows|98|nt|95)/i.test(ua)) {
    osName = "Windows";
    if (/nt 10\.0/i.test(ua)) osVersion = "10/11";
    else if (/nt 6\.3/i.test(ua)) osVersion = "8.1";
    else if (/nt 6\.2/i.test(ua)) osVersion = "8";
    else if (/nt 6\.1/i.test(ua)) osVersion = "7";
    else if (/nt 6\.0/i.test(ua)) osVersion = "Vista";
    else if (/nt 5\.1/i.test(ua)) osVersion = "XP";
  } else if (/android/i.test(ua)) {
    osName = "Android";
    const match = ua.match(/android\s+([\d\.]+)/i);
    if (match) osVersion = match[1];
    deviceType = /mobile/i.test(ua) ? "Mobile" : "Tablet";
  } else if (/ipad/i.test(ua)) {
    osName = "iPadOS";
    const match = ua.match(/os\s+([\d_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
    deviceType = "Tablet";
  } else if (/iphone/i.test(ua)) {
    osName = "iOS";
    const match = ua.match(/os\s+([\d_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
    deviceType = "Mobile";
  } else if (/macintosh|mac os x/i.test(ua)) {
    osName = "macOS";
    const match = ua.match(/mac os x\s+([\d_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (/cros/i.test(ua)) {
    osName = "ChromeOS";
  } else if (/linux/i.test(ua)) {
    osName = "Linux";
  }

  // --- Detect Tablet / Mobile if not already set ---
  if (deviceType === "Desktop") {
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      deviceType = "Tablet";
    } else if (/mobi|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
      deviceType = "Mobile";
    }
  }

  // --- Detect Browser ---
  if (/edg(e|a|ios)?\/([\d\.]+)/i.test(ua)) {
    browserName = "Microsoft Edge";
    browserFamily = "Edge";
    browserVersion = ua.match(/edg(e|a|ios)?\/([\d\.]+)/i)?.[2] || "";
  } else if (/opr\/([\d\.]+)/i.test(ua) || /opera/i.test(ua)) {
    browserName = "Opera";
    browserFamily = "Opera";
    browserVersion = ua.match(/opr\/([\d\.]+)/i)?.[1] || "";
  } else if (/samsungbrowser\/([\d\.]+)/i.test(ua)) {
    browserName = "Samsung Internet";
    browserFamily = "Samsung";
    browserVersion = ua.match(/samsungbrowser\/([\d\.]+)/i)?.[1] || "";
  } else if (/chrome|crios/i.test(ua) && !/edg|opr/i.test(ua)) {
    browserName = "Chrome";
    browserFamily = "Chrome";
    const match = ua.match(/(?:chrome|crios)\/([\d\.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/firefox|fxios/i.test(ua)) {
    browserName = "Firefox";
    browserFamily = "Firefox";
    const match = ua.match(/(?:firefox|fxios)\/([\d\.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/version\/([\d\.]+).*safari/i.test(ua) || (/safari/i.test(ua) && !/chrome/i.test(ua))) {
    browserName = "Safari";
    browserFamily = "Safari";
    const match = ua.match(/version\/([\d\.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/msie|trident/i.test(ua)) {
    browserName = "Internet Explorer";
    browserFamily = "IE";
  }

  const deviceDisplayName = `${browserName} on ${osName}${osVersion ? " " + osVersion : ""}`;

  return {
    browser: {
      name: browserName,
      version: browserVersion,
      family: browserFamily,
    },
    os: {
      name: osName,
      version: osVersion,
    },
    device: {
      type: deviceType,
      model: deviceModel,
      name: deviceDisplayName,
    },
    userAgent: ua,
  };
}
