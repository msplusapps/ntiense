class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="bg-gray-800 text-white p-4">
                <div class="container mx-auto">
                    <h1 class="text-xl">ChatWiz Admin Panel</h1>
                </div>
            </nav>
        `;
    }
}

customElements.define('custom-navbar', CustomNavbar);
