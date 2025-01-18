const chatbox = document.getElementById('chatbox');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const closeModal = document.getElementById('closeModal');
const clearButton = document.getElementById('clearButton');
let attachedImage = null;

function handleImage(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        attachedImage = img.src;
        const previewDiv = document.createElement('div');
        previewDiv.classList.add('image-preview');
        previewDiv.innerHTML = `
            <img src="${img.src}" alt="Image Preview" onclick="expandImage('${img.src}')">
            <button class="remove-btn" onclick="removeImage()">×</button>
        `;
        imagePreviewContainer.innerHTML = '';
        imagePreviewContainer.appendChild(previewDiv);
        enableSendButton();
    };
    reader.readAsDataURL(file);
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        handleImage(file);
    }
});

document.getElementById('chatInput').addEventListener('paste', (event) => {
    const items = event.clipboardData.items;
    for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            handleImage(file);
        }
    }
});

function removeImage() {
    imagePreviewContainer.innerHTML = '';
    attachedImage = null;
    fileInput.value = '';
    disableSendButton();
}

function disableSendButton() {
    sendButton.disabled = true;
}

function enableSendButton() {
    sendButton.disabled = false;
}

function expandImage(src) {
    modalImage.src = src;
    imageModal.style.display = 'block';
}

closeModal.onclick = function() {
    imageModal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === imageModal) {
        imageModal.style.display = 'none';
    }
}

chatInput.addEventListener('input', () => {
    if (chatInput.value.trim() || attachedImage) {
        enableSendButton();
    } else {
        disableSendButton();
    }
});

function saveChatHistory() {
    const chatMessages = [];
    const messages = chatbox.querySelectorAll('.chat-message');
    messages.forEach(message => {
        const messageContent = message.innerHTML;
        const messageType = message.classList.contains('user-message') ? 'user' : 'bot';
        const isImage = message.querySelector('img') ? true : false;
        const imgSrc = isImage ? message.querySelector('img').src : null;
        chatMessages.push({ content: messageContent, type: messageType, isImage: isImage, imgSrc: imgSrc });
    });
    localStorage.setItem('chatHistory', JSON.stringify(chatMessages));
}

function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    chatHistory.forEach(message => {
        addMessage(message.content, message.type, message.isImage, message.imgSrc);
    });

    if (chatInput.value.trim() || attachedImage) {
        enableSendButton();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
});

function addMessage(content, type = 'user', isImage = false, imgSrc = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', `${type}-message`);
    if (!isImage) {
        content = content.replace(/\n/g, '<br>');
    }

    if (isImage) {
        const img = document.createElement('img');
        img.src = imgSrc || content;
        img.style.maxWidth = '250px';
        img.style.maxHeight = '250px';
        img.style.objectFit = 'contain';
        img.style.cursor = 'pointer';
        img.onclick = () => expandImage(img.src);
        messageDiv.appendChild(img);
    } else {
        messageDiv.innerHTML = content;
    }

    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
    saveChatHistory();
}

sendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message || attachedImage) {
        if (message) {
            addMessage(message, 'user');
        }
        if (attachedImage) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            fetch('/upload-image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'File uploaded successfully') {
                    const imageUrl = data.filepath;
                    addMessage(imageUrl, 'user', true, imageUrl);

                    fetch('/get-bot-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: message, file_url: imageUrl })
                    })
                    .then(response => response.json())
                    .then(data => {
                        const botMessage = data.message;
                        const labeledImageUrl = data.labeled_image;
                        addMessage(botMessage, 'bot');
                        addMessage(labeledImageUrl, 'bot', true, labeledImageUrl);
                        enableSendButton();
                    })
                    .catch(error => {
                        console.error('Error fetching bot message:', error);
                    });
                } else {
                    alert('Error uploading image: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error uploading image:', error);
                alert('Failed to upload the image. Please try again!');
            });

            attachedImage = null;
            imagePreviewContainer.innerHTML = '';
            fileInput.value = '';
        } else {
            fetch('/get-bot-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            })
            .then(response => response.json())
            .then(data => {
                const botMessage = data.message;
                addMessage(botMessage, 'bot');
                enableSendButton();
            })
            .catch(error => {
                console.error('Error fetching bot message:', error);
            });
        }

        chatInput.value = ''; 
        disableSendButton();
    }
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && sendButton.disabled) {
        e.preventDefault();
    }
    if (e.key === 'Enter' && !sendButton.disabled) {
        sendButton.click();
    }
});

clearButton.addEventListener('click', () => {
    chatbox.innerHTML = '';
    localStorage.removeItem('chatHistory');
    attachedImage = null;
    imagePreviewContainer.innerHTML = '';
    fileInput.value = '';
    disableSendButton();
});
