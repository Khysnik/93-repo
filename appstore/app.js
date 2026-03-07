import { JSON5 } from "/42/formats/data/JSON5.js";
import {
		getInstallPath,
		isInstalled,
		installApp,
		uninstallApp
    } from "./appInstaller.js"

let statusEl;
let appsContainer;

const REPO_LIST_URL = 'https://repo93.xd4y.zip/';
const MANIFEST_FILE = 'manifest.json';
const APP_MANIFEST_FILE = 'app.manifest.json5';

// const statusEl = document.getElementById('status');
// const appsEl = document.getElementById('apps');

async function createAppCard(manifest, repoDisplayUrl, repoFetchBaseUrl, appPath, appFiles) {
    let icon = "/42/assets/icons/32x32/apps/generic.png"
    if (manifest.icons != null){
        for(let obj in manifest.icons) {
            if(obj.size == 32) {
                icon = repoFetchBaseUrl+appPath+manifest.icons.url // TODO: test
            }
        }
    }

    sys42.render({
        "tag": "fieldset",
        content: [
            {
                tag: "img",
                width: 32,
                height: 32,
                src: icon // TODO: this
            },

            {
                tag: "b",
                style: "margin-left: 10px;",
                content: manifest.name+" " 
            },
            {
                tag: "span",
                style: "display: inline list-item; color: inherit;",
                href: repoDisplayUrl,
                content: repoDisplayUrl,
                target: "__blank"
            },
            {
                tag: "span.block",
                content: manifest.description
            },
            {
                tag: "button.block",
                content: "Install",
                action: async (e)=>{
                    e.target.disabled = true
                    const installed = await isInstalled(repoFetchBaseUrl, appPath, manifest, appFiles);
                    try {

                        if (installed) { // TODO: turn in progress bars
                            e.target.textContent = "Uninstalling..."
                            await uninstallApp(manifest, repoFetchBaseUrl, appPath, appFiles);
                        } else {
                            e.target.textContent = "Installing..."
                            await installApp(manifest, repoFetchBaseUrl, appPath, appFiles);
                        }
                    } catch (err) {
                        sys42.alert(`Something went wrong! ${err}`)
                    } finally {
                        if (installed) e.target.textContent = "Install" // installed value is opposite of truth
                        else e.target.textContent = "Uninstall"
                        e.target.disabled = false
                    }
                }
            }
        ]
    }, appsContainer)
}


function normalizeRepoUrl(url) {
    return String(url || '').replace(/\/+$/, '');
}

function resolveRepoFetchBaseUrl(repoUrl) {
    const normalized = normalizeRepoUrl(repoUrl);
    return normalized;
}

function normalizeAppPath(pathValue) {
    return String(pathValue || '').replace(/^\/+|\/+$/g, '');
}

async function loadApps() {
    appsContainer.innerHTML = ""
    statusEl.textContent = "loading..."
    try {
        const repoResponse = await fetch(REPO_LIST_URL);

        if (!repoResponse.ok) {
            throw new Error(`Failed to fetch repo list (${repoResponse.status})`);
        }

        const repos = await repoResponse.json();

        if (!Array.isArray(repos)) {
            throw new Error('Repo list response is not an array');
        }

        let foundApps = 0;
        let failedRepos = 0;
        let failedApps = 0;

        for (const repo of repos) {
            const repoDisplayUrl = normalizeRepoUrl(repo);
            const repoFetchBaseUrl = resolveRepoFetchBaseUrl(repoDisplayUrl);
            const manifestUrl = `${repoFetchBaseUrl}/${MANIFEST_FILE}`;

            try {
                const manifestResponse = await fetch(manifestUrl);

                if (!manifestResponse.ok) {
                    failedRepos += 1;
                    continue;
                }

                const repoManifestText = await manifestResponse.text();
                const repoManifest = JSON5.parse(repoManifestText);

                if (!repoManifest || typeof repoManifest !== 'object' || Array.isArray(repoManifest)) {
                    failedRepos += 1;
                    continue;
                }

                for (const [appPathRaw, appFiles] of Object.entries(repoManifest)) {
                    if (!Array.isArray(appFiles) || !appFiles.includes(APP_MANIFEST_FILE)) {
                        continue;
                    }

                    const appPath = normalizeAppPath(appPathRaw);
                    const appManifestUrl = `${repoFetchBaseUrl}/${appPath}/${APP_MANIFEST_FILE}`;

                    try {
                        const appManifestResponse = await fetch(appManifestUrl);

                        if (!appManifestResponse.ok) {
                            failedApps += 1;
                            continue;
                        }

                        const appManifestText = await appManifestResponse.text();
                        const appManifest = JSON5.parse(appManifestText);

                        await createAppCard(appManifest, repoDisplayUrl, repoFetchBaseUrl, appPath, appFiles);
                        await createAppCard(appManifest, repoDisplayUrl, repoFetchBaseUrl, appPath, appFiles);
                        foundApps += 1;
                    } catch (error) {
                        sys42.alert(error)
                        failedApps += 1;
                    }
                }
            } catch (error) {
                console.error(error)
                failedRepos += 1;
            }
        }

        statusEl.textContent = `Loaded ${foundApps} app(s) from ${repos.length} repo(s). Repo failures: ${failedRepos}. App failures: ${failedApps}.`;

        if (foundApps === 0) {
            sys42.render({
                tag: "fieldset",
                content: "No apps found"
            }, appsContainer)
        }
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
    }
}

export async function renderApp(app) {
    return {
        tag: "main",
        content: [
            {
                tag: "h2",
                content: "Appstore type shi"
            },
            {
                tag: "span",
                content: "loading...",
                created: (el)=>{statusEl = el}
            },
            {
                tag: "div",
                created: (el)=>{appsContainer = el; loadApps();}
            }
        ]
    }
}