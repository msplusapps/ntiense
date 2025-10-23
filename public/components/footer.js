class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="bg-gray-800 text-white p-4 mt-8">
                <div class="container mx-auto text-center">
                    <p>&copy; 2023 ChatWiz. All rights reserved.</p>
                </div>
            </footer>
        `;
    }
}

customElements.define('custom-footer', CustomFooter);
