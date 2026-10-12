export const themeStorageKey = "theme";

export const themeBootScript = `(function(){try{var t=localStorage.getItem("${themeStorageKey}")||"system";var dark=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.classList.toggle("light",!dark);root.dataset.theme=t;root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;
