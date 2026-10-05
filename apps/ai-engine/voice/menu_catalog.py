"""Finite public menu catalog. Never accept guest-provided synthesis text."""

MENU_AUDIO = {
    "welcome": (
        "Selamat datang di KODMOD. Pilih suara KODMOD atau suara perangkat. Tekan contoh suara untuk mendengarkan. Pembaca menu dapat dimatikan. Suara Tutor tetap aktif saat belajar.",
        "Welcome to KODMOD. Choose the KODMOD voice or your device voice. Press preview to listen. You can turn menu reading off. Your Tutor still speaks while you learn.",
    ),
    "preview": (
        "Halo, ini suara KODMOD. Saya akan menemanimu belajar, satu langkah demi satu langkah.",
        "Hello, this is the KODMOD voice. I will help you learn, one step at a time.",
    ),
    "home": ("Beranda", "Home"),
    "about": ("Tentang KODMOD", "About KODMOD"),
    "how": ("Cara belajar", "How to learn"),
    "features": ("Fitur", "Features"),
    "faq": ("Pertanyaan umum", "Frequently asked questions"),
    "login": ("Masuk", "Sign in"),
    "register": ("Daftar", "Create an account"),
    "username": ("Username. Isi nama pengguna akunmu.", "Username. Enter your account username."),
    "password": ("Kata sandi", "Password"),
    "full-name": ("Nama lengkap", "Full name"),
    "role": ("Pilih peran siswa atau guru", "Choose student or teacher"),
    "dashboard": ("Dashboard", "Dashboard"),
    "classes": ("Kelas saya", "My classes"),
    "materials": ("Pustaka materi", "Learning library"),
    "tutor": ("Tutor AI", "AI Tutor"),
    "practice": ("Latihan", "Practice"),
    "assignments": ("Tugas dari guru", "Teacher assignments"),
    "progress": ("Progres saya", "My progress"),
    "quizzes": ("Kuis dan penugasan", "Quizzes and assignments"),
    "review": ("Review kuis", "Quiz reviews"),
    "analytics": ("Analitik siswa", "Student analytics"),
    "users": ("Pengguna", "Users"),
    "activity": ("Aktivitas dan layanan", "Activity and services"),
    "sound": ("Pengaturan suara dan bahasa", "Voice and language settings"),
    "sound-on": ("Suara menu aktif", "Menu voice is on"),
    "sound-off": ("Suara menu mati", "Menu voice is off"),
    "language": (
        "Bahasa. Pilih Bahasa Indonesia atau Inggris.",
        "Language. Choose Indonesian or English.",
    ),
    "navigation": ("Buka navigasi", "Open navigation"),
    "language-changed": (
        "Bahasa telah berubah ke Bahasa Indonesia.",
        "Language changed to English.",
    ),
    "logout": ("Keluar dari akun", "Sign out"),
    "lang-id": ("Bahasa Indonesia", "Indonesian"),
    "lang-en": ("Bahasa Inggris", "English"),
    "dropdown-opened": (
        "Daftar pilihan dibuka.",
        "Selection list opened.",
    ),
    "lang-id-selected": (
        "Bahasa Indonesia dipilih.",
        "Indonesian selected.",
    ),
    "lang-en-selected": (
        "Bahasa Inggris dipilih.",
        "English selected.",
    ),
    "hero-title": (
        "Pahami pelajaran, selangkah demi selangkah.",
        "Understand lessons, step by step.",
    ),
    "hero-subtitle": (
        "Belajar dari materi guru, tanyakan yang belum kamu pahami, dan berlatih bersama Tutor AI. Pilih teks atau suara yang nyaman untukmu.",
        "Learn from teacher materials, ask what you don't understand yet, and practice with AI Tutor. Choose text or voice that feels comfortable for you.",
    ),
    "chip-text-voice": (
        "Teks dan suara. Belajar dengan membaca atau mendengarkan.",
        "Text and voice. Learn by reading or listening.",
    ),
    "chip-keyboard": (
        "Navigasi keyboard. Akses mudah tanpa tetikus.",
        "Keyboard navigation. Easy access without a mouse.",
    ),
    "floating-listen": (
        "Dengarkan penjelasan. Jeda, ulangi, atau lanjutkan.",
        "Listen to explanations. Pause, repeat, or continue.",
    ),
    "floating-ask": (
        "Tanyakan yang belum paham. Satu pertanyaan setiap langkah.",
        "Ask what you don't understand yet. One question at each step.",
    ),
    "principles": (
        "Materi dari guru, Tutor yang menemani, Latihan dan penugasan.",
        "Teacher materials, Accompanying tutor, Practice and assignments.",
    ),
    "heading-about": (
        "Semua kebutuhan belajar, lebih mudah dijangkau. Dirancang untuk siswa tunanetra dan low vision, dengan pendampingan guru.",
        "All learning needs, easier to reach. Designed for blind and low vision students, with teacher guidance.",
    ),
    "feature-materials": (
        "Materi belajar. Buka materi dari kelasmu dan lanjutkan bacaan dari bagian terakhir.",
        "Learning materials. Open materials from your class and continue reading from where you left off.",
    ),
    "feature-tutor": (
        "Tutor AI. Bahas materi, minta contoh sederhana, dan dengarkan penjelasannya.",
        "AI Tutor. Discuss material, ask for simple examples, and listen to explanations.",
    ),
    "feature-practice": (
        "Latihan dan penugasan. Uji pemahaman melalui latihan dan kuis yang ditugaskan guru.",
        "Practice and assignments. Test understanding through practice and quizzes assigned by the teacher.",
    ),
    "feature-progress": (
        "Progres belajar. Lihat hasil belajar dan tentukan bagian yang perlu dilatih lagi.",
        "Learning progress. View study results and decide which sections need more practice.",
    ),
    "heading-how": (
        "Mulai dari materi, lanjutkan dengan rasa ingin tahu. Atur suara sekali. Setelah itu, belajar dengan ritmemu sendiri.",
        "Start from materials, continue with curiosity. Set up voice once, then learn at your own pace.",
    ),
    "step-1": (
        "Langkah satu. Bergabung dengan kelas. Daftar sebagai siswa, lalu buka kelas yang kamu ikuti.",
        "Step one. Join a class. Register as a student, then open the class you are enrolled in.",
    ),
    "step-2": (
        "Langkah dua. Pilih materi belajar. Baca atau dengarkan materi yang sudah dibagikan guru.",
        "Step two. Select learning material. Read or listen to materials shared by your teacher.",
    ),
    "step-3": (
        "Langkah tiga. Tanyakan dan latih pemahamanmu. Bertanya kepada Tutor, kemudian kerjakan latihan atau tugas.",
        "Step three. Ask questions and practice your understanding. Ask the Tutor, then do practice or assignments.",
    ),
    "step-4": (
        "Langkah empat. Lanjutkan dari progresmu. Lihat hasil, baca pembahasan yang tersedia, dan lanjutkan belajar.",
        "Step four. Continue from your progress. Review results, read available discussions, and keep learning.",
    ),
    "section-teacher": (
        "Ruang kerja guru yang inklusif. Siapkan pembelajaran, dampingi setiap siswa, dan kelola kelas dengan mudah.",
        "Inclusive teacher workspace. Prepare learning, accompany each student, and manage classes with ease.",
    ),
    "access-1": (
        "Keyboard dan pembaca layar. Fokus terlihat, label jelas, dan navigasi berurutan.",
        "Keyboard and screen reader. Visible focus, clear labels, and sequential navigation.",
    ),
    "access-2": (
        "Tampilan yang bisa disesuaikan. Aktifkan teks lebih besar dan pilihan navigasi geser.",
        "Customizable display. Enable larger text and swipe navigation options.",
    ),
    "access-3": (
        "Kendali suara di tanganmu. Atur pembaca menu dan suara Tutor secara terpisah.",
        "Voice control in your hands. Adjust menu reader and Tutor voice separately.",
    ),
    "faq-1": (
        "Bagaimana cara membuat akun? Pilih Daftar, isi nama, username dan kata sandi, lalu pilih peran siswa atau guru.",
        "How to create an account? Choose Register, fill in name, username and password, then select student or teacher role.",
    ),
    "faq-2": (
        "Apakah saya harus menggunakan suara? Kamu bisa menggunakan teks. Pembaca menu dan suara Tutor dapat diatur terpisah.",
        "Do I have to use voice? You can use text. Menu reader and Tutor voice can be adjusted separately.",
    ),
    "faq-3": (
        "Bisa menggunakan suara dari HP? Bisa. Pilih Suara perangkat dalam pengaturan.",
        "Can I use phone voice? Yes. Choose Device voice in settings.",
    ),
    "faq-4": (
        "Bagaimana Tutor menggunakan materi? Pilih materi kelas di ruang Tutor agar penjelasan mengacu pada materi yang kamu pelajari.",
        "How does the Tutor use materials? Select class materials in the Tutor room so explanations refer to the material you are studying.",
    ),
    "faq-5": (
        "Apakah tersedia Bahasa Inggris? Pilih EN dari menu bahasa. Tampilan dan jawaban Tutor mengikuti bahasa pilihanmu.",
        "Is English available? Choose EN from the language menu. Display and Tutor answers follow your chosen language.",
    ),
    "section-cta": (
        "Siap mulai belajar? Buat akunmu dan pilih cara belajar yang paling nyaman.",
        "Ready to start learning? Create your account and choose the most comfortable way to learn.",
    ),
    "footer-tagline": (
        "Ruang belajar untuk semua.",
        "A learning space for everyone.",
    ),
}
