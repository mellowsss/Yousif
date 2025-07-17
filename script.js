document.addEventListener('DOMContentLoaded', () => {
  const name = "Yousif Saieb";
  const nameContainer = document.getElementById('nameContainer');

  name.split('').forEach((letter, index) => {
    const span = document.createElement('span');
    span.textContent = letter;
    span.style.animationDelay = `${index * 0.3}s`;
    nameContainer.appendChild(span);
  });

  function spawnCodeSnippet() {
    const snippets = [
      "console.log('Hello World!');",
      "let x = 69420;",
      "def greet():\n    return 'Joseph needs help';",
      "for (let i = 0; i < 10; i++) {}",
      "if (x > 10) { console.log(x); }"
    ];

    const snippet = document.createElement('div');
    snippet.className = 'code-snippet';
    snippet.textContent = snippets[Math.floor(Math.random() * snippets.length)];

    snippet.style.left = `${Math.random() * 80 + 10}vw`;
    snippet.style.top = `${Math.random() * 80 + 10}vh`;

    document.body.appendChild(snippet);

    setTimeout(() => {
      document.body.removeChild(snippet);
    }, 3000);
  }

  let snippetInterval = setInterval(spawnCodeSnippet, 500);

  setTimeout(() => {
    clearInterval(snippetInterval);
    document.body.innerHTML = `
        <div class="link-section fadeInSection">
            <h1 class="animated-header">Welcome to my site!</h1>
            <p class="fadeInSection">This is my little project during the break.</p>
            <p class="fadeInSection" style="animation-delay: 0.5s;">Connect with me:</p>
            <a href="https://www.linkedin.com/in/saieby/" class="fadeInSection" style="animation-delay: 0.7s;" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn">
            </a>
            <p class="fadeInSection" style="animation-delay: 1s;">Explore my work:</p>
            <a href="https://codeCoogs.com" class="fadeInSection" style="animation-delay: 1.3s;" target="_blank">
                <img src="codecoogs.ico" alt="CodeCoogs" style="width: 70px; height: 70px;">
            </a>
            <p class="fadeInSection" style="animation-delay: 1.4s;">Try my To-Do List project:</p>
            <a href="todo.html" class="fadeInSection" style="animation-delay: 1.5s;" target="_blank">
                <img src="logo.png" alt="To-Do List" style="width: 70px; height: 70px;">
            </a>
            <p class="fadeInSection" style="animation-delay: 1.6s;">Work in Progress!</p>
            <div style="margin-top: 20px; text-align: center;">
                <a href="https://instagram.com/mxr1yousif2/" class="fadeInSection" style="animation-delay: 1.8s;" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram">
            </a>
            </div>
        </div>`;

    const body = document.body;
    let lastClickTime = 0;

    body.addEventListener('click', event => {
      if (event.target.closest('.link-section, .code-snippet')) return;

      const now = Date.now();
      if (now - lastClickTime < 100) return;
      lastClickTime = now;

      spawnCodeSnippet();
    });
  }, name.length * 300 + 2000);
});
