// Cursor movement-based animation
document.addEventListener("mousemove", (e) => {
  const texts = document.querySelectorAll(".animate-text");
  const { innerWidth: width, innerHeight: height } = window;

  const rotateX = ((e.clientY / height) - 0.5) * 10;
  const rotateY = ((e.clientX / width) - 0.5) * 10;

  texts.forEach(text => {
    text.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
});

document.addEventListener("mouseleave", () => {
  document.querySelectorAll(".animate-text").forEach(text => {
    text.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
});
