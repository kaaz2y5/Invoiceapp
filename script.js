// Show popup on page load
window.onload = function() {
  document.getElementById("popup").style.display = "block";
};

// Close popup when clicking the X
document.querySelector(".close-btn").onclick = function() {
  document.getElementById("popup").style.display = "none";
};

// Close popup when clicking outside the box
window.onclick = function(event) {
  let popup = document.getElementById("popup");
  if (event.target === popup) {
    popup.style.display = "none";
  }
};

