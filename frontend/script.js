
// --- Auth logic ---
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const authMessage = document.getElementById('authMessage');

function showMain() {
    authSection.style.display = 'none';
    mainSection.style.display = '';
    // Display user email if available
    const token = localStorage.getItem('token');
    let email = '';
    if (token) {
        try {
            // JWT: header.payload.signature (payload is base64)
            const payload = JSON.parse(atob(token.split('.')[1]));
            email = payload.email || '';
        } catch {}
    }
    document.getElementById('userEmailDisplay').textContent = email ? `Logged in as: ${email}` : '';
}
function showAuth() {
    authSection.style.display = '';
    mainSection.style.display = 'none';
}
function setAuthMessage(msg, isError) {
    authMessage.textContent = msg;
    authMessage.style.color = isError ? 'red' : 'green';
}

// Check for token on load
if (localStorage.getItem('token')) {
    showMain();
} else {
    showAuth();
}

document.getElementById('loginBtn').onclick = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return setAuthMessage('Email and password required.', true);
    const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        setAuthMessage('Login successful!', false);
        showMain();
    } else {
        setAuthMessage(data.error || 'Login failed.', true);
    }
};

document.getElementById('registerBtn').onclick = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return setAuthMessage('Email and password required.', true);
    const res = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        setAuthMessage('Registration successful! Please verify your email.', false);
    } else {
        setAuthMessage(data.error || 'Registration failed.', true);
    }
};

document.getElementById('logoutBtn').onclick = function() {
    localStorage.removeItem('token');
    showAuth();
};

// --- Main app logic ---
document.getElementById('generateBtn').addEventListener('click', async function() {
    const transcriptInput = document.getElementById('transcriptInput');
    const customPrompt = document.getElementById('customPrompt').value.trim() || 'Generate summary';
    const summaryOutput = document.getElementById('summaryOutput');

    if (!transcriptInput.files.length) {
        alert('Please upload a transcript file.');
        return;
    }

    const file = transcriptInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        const transcriptText = e.target.result;
        // Send to backend for summary generation
        const response = await fetch('http://localhost:3000/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcriptText, prompt: customPrompt })
        });
        if (response.ok) {
            const data = await response.json();
            summaryOutput.innerText = data.summary;
        } else {
            summaryOutput.innerText = 'Error generating summary.';
        }
    };
    reader.readAsText(file);
});

document.getElementById('shareBtn').addEventListener('click', async function() {
    const emailInput = document.getElementById('emailInput').value.trim();
    const summary = document.getElementById('summaryOutput').innerText;
    if (!emailInput) {
        alert('Please enter recipient email(s).');
        return;
    }
    if (!summary) {
        alert('No summary to share.');
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to share.');
        return;
    }
    const response = await fetch('http://localhost:3000/share', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ emails: emailInput, summary })
    });
    if (response.ok) {
        alert('Summary shared successfully!');
    } else {
        alert('Failed to share summary.');
    }
});
