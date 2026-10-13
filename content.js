/*
  OS PARTNER PORTAL — CONTENT
  This is the only file you edit to add, remove or change what partners see.

  TO ADD A RESOURCE: copy one { ... } block in `resources`, paste it at the top
  of the list, and change the fields. The newest `date` becomes the Latest Drop.

  type:   "replay"   = call replay (video)
          "tutorial" = video tutorial
          "guide"    = PDF guide (downloadable)

  video:  paste the normal share link from wherever the video is hosted.
          A direct .mp4 link (or a file in the /media folder) plays in the
          phone's own video player, which is the cleanest result. YouTube,
          Vimeo, Loom and Google Drive links are embedded using that service's
          player. Leave it "" and the card shows "Coming Soon".

  file:   put the PDF in the /files folder and write "files/Your-File.pdf".
  cover:  optional image for the card (guides use page one of the PDF).
  poster: optional photo for a video card. The title, label and bison are laid
          over it automatically. For a Google Drive video use
          "https://drive.google.com/thumbnail?id=FILE_ID&sz=w1280".
  related: optional id of a guide to offer as a download under a video.
*/

window.PORTAL = {
  call: {
    weekday: 1, // 0 = Sunday, 1 = Monday
    hour: 18, // 6 PM, in the time zone below
    minute: 0,
    timeZone: "America/New_York",
    lengthMinutes: 60,
    timeLabel: "6 PM ET / 5 PM CT",
    host: "Matt Graham",
    where: "Join In The Operator Standard App.",
    topic: "", // optional: this week's topic, e.g. "Tell Your Story in 3 Parts."
  },

  resources: [
    {
      id: "instagram-edits-tutorial",
      type: "tutorial",
      title: "Instagram Edits Tutorial",
      date: "2026-10-08",
      description: "A walkthrough of editing your content in Instagram's Edits app.",
      // Compressed copy hosted with the site. Original: https://drive.google.com/file/d/103GP8rAnRnoeE1KfgCY_l2odk9SJF_np/view
      video: "media/instagram-edits-tutorial.mp4",
      poster: "assets/posters/instagram-edits-tutorial.jpg",
      duration: "10:38",
    },
    {
      id: "content-posting-checklist",
      type: "guide",
      title: "The Content Posting Checklist",
      date: "2026-10-06",
      description: "Check every box before you hit post. Covers filming, hook, retention and the final review.",
      file: "files/OS-Content-Posting-Checklist.pdf",
      cover: "assets/covers/OS-Content-Posting-Checklist.jpg",
      pages: 1,
      size: "40 KB",
    },
    {
      id: "content-creation-basics",
      type: "replay",
      title: "Content Creation Basics",
      date: "2026-10-05",
      description: "Content Creation 101. What to say, how to film it and what to check before you post.",
      poster: "assets/posters/content-creation-basics.jpg",
      video: "https://drive.google.com/file/d/1_AgMwmYwwqLBkndEgeWa3LpDPW6QldoF/view",
      duration: "1:03:24",
      related: "content-posting-checklist",
    },
    {
      id: "partner-content-guide",
      type: "guide",
      title: "Partner Content Guide",
      date: "2026-09-28",
      description: "A tactical structure for what to post, how often to post it and how to use the partner community to improve.",
      file: "files/OS-Partner-Content-Guide.pdf",
      cover: "assets/covers/OS-Partner-Content-Guide.jpg",
      pages: 2,
      size: "17.5 MB",
    },
    {
      id: "hook-templates-library",
      type: "guide",
      title: "Hook Templates Library",
      date: "2026-09-28",
      description: "Make any hook your own. Replace the brackets with your details and use the example as a guide.",
      file: "files/OS-Hook-Templates-Library.pdf",
      cover: "assets/covers/OS-Hook-Templates-Library.jpg",
      pages: 60,
      size: "767 KB",
    },
    {
      id: "five-habits",
      type: "replay",
      title: "5 Habits of a Winning OS Partner",
      date: "2026-09-28",
      description: "Partner tactics. The daily and weekly habits to apply now.",
      poster: "assets/posters/five-habits.jpg",
      video: "https://drive.google.com/file/d/1sfzWZrVlKeN_7SdVe0UX89V1Py0p1oTP/view",
      duration: "47:42",
      related: "partner-content-guide",
    },
    {
      id: "ten-things-guide",
      type: "guide",
      title: "10 Things Partners Need To Know",
      date: "2026-09-21",
      description: "The partner field guide. Live The Standard. Share The Proof.",
      file: "files/10-Things-Every-OS-Partner-Needs-To-Know.pdf",
      cover: "assets/covers/10-Things-Every-OS-Partner-Needs-To-Know.jpg",
      pages: 1,
      size: "41 KB",
    },
    {
      id: "ten-things-call",
      type: "replay",
      title: "10 Things Every OS Partner Needs to Know",
      date: "2026-09-21",
      description: "The full call behind the field guide.",
      poster: "assets/posters/ten-things-call.jpg",
      video: "https://drive.google.com/file/d/1wBk7_2xbpzpZoyCHPlg0BZXgpGjb1aIw/view",
      duration: "1:07:50",
      related: "ten-things-guide",
    },
    {
      id: "kickoff-call",
      type: "replay",
      title: "Kickoff Call Q&A",
      date: "2026-09-14",
      description: "The first partner call. Open questions and answers on personal brand and content.",
      poster: "assets/posters/kickoff-call.jpg",
      video: "https://drive.google.com/file/d/1lzQ8ci9bYo_98X-dHE0deLlCgvJPRRR7/view",
      duration: "1:21:03",
    },
  ],
};
