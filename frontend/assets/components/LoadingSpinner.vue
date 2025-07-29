<template>
    <div v-if="isLoading" class="loading-spinner">
        <div class="spinner"></div>
        <p>Cargando datos...</p>
    </div>
</template>

<script>
export default {
    name: 'LoadingSpinner',
    props: {
        isLoading: {
            type: Boolean,
            required: true,
        },
    },
}
</script>

<style scoped>
.loading-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(255, 255, 255, 0.445);
    padding: 20px;
    border-radius: 10px;
    z-index: 2000;
    text-align: center;
    font-size: 1.2em;
    color: #333;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
}

.spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #000000;
    animation: spin 0.5s ease infinite;
    margin-bottom: 10px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>