const thumbnails = document.querySelectorAll('.thumbnail-card');
        const mainVideo = document.getElementById('mainVideo');

        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function() {
                // Remover clase active de todas las miniaturas
                thumbnails.forEach(t => t.classList.remove('active'));
                
                // Agregar clase active a la miniatura clickeada
                this.classList.add('active');
                
                // Cambiar el video principal
                const videoId = this.getAttribute('data-video-id');
                const videoTitle = this.getAttribute('data-title');
                mainVideo.src = `https://www.youtube.com/embed/${videoId}`;
                mainVideo.title = videoTitle;
            });
        });
