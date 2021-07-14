const { remote } = require('electron');

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
console.log("Loading spash js")
window.addEventListener('DOMContentLoaded', () => {
    const element = document.getElementById('version')
    if (element){
      console.log(remote)
      element.innerText = remote.app.getVersion()
    }
})
