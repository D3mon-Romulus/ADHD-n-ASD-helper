function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // If this is opened directly, you might want to redirect to your main app
    window.location.href = 'index.html'; // Adjust this to your main app file
  }
}