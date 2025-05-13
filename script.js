document.getElementById('quote-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('https://ace-agro-backend.onrender.com/submit-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (response.ok) {
      alert('Quote request sent successfully! We will contact you within 24 hours.');
    } else {
      console.error('Server responded with error:', result);
      alert(`Failed to send quote request: ${result.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
    alert(`An error occurred: ${error.message}. Please try again later.`);
  }
});