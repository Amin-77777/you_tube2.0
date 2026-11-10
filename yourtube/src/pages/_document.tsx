import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pref = localStorage.getItem('yt_theme_pref');
                  var eff = 'light';
                  if (pref === 'dark') {
                    eff = 'dark';
                  } else if (pref === 'light') {
                    eff = 'light';
                  } else {
                    // Auto mode based on Asia/Kolkata (IST): Light from 5:00 AM to 11:59 AM, Dark from 12:00 PM to 4:59 AM
                    var now = new Date();
                    var formatter = new Intl.DateTimeFormat('en-US', {
                      timeZone: 'Asia/Kolkata',
                      hour: 'numeric',
                      hour12: false
                    });
                    var hour = parseInt(formatter.format(now), 10) % 24;
                    if (hour >= 5 && hour < 12) {
                      eff = 'light';
                    } else {
                      eff = 'dark';
                    }
                  }
                  if (eff === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
