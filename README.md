# Tinkergrass 

Welcome to the repository for the Tinkergrass website, built with [Hugo](https://gohugo.io/) and the [Docsy](https://www.docsy.dev/) theme. 

This site is statically generated and hosted via GitHub Pages, designed to showcase our work in intelligent motion planning and autonomous robotic systems.

## Prerequisites & Installation (Linux/Ubuntu)

To run this website locally, you need **Node.js** and the **Extended** version of Hugo (v0.146.0 or higher). If you are setting this up on a new Linux machine, run these commands:

**1. Install Node.js & npm:**
```bash
sudo apt update
sudo apt install nodejs npm
````

**2. Install Hugo Extended:**
Standard package managers often install outdated versions. It is recommended to use Snap to ensure you get the latest Extended release:

```bash
sudo snap install hugo --channel=extended
```

*(Verify your installation by running `hugo version`. The output must include the word "extended".)*

## Local Development Setup

Follow these steps to pull down the code and run the development server:

**1. Clone the repository and navigate into the folder:**

```bash
git clone [https://github.com/tinkergrassmo/tinkergrassmo.github.io.git](https://github.com/tinkergrassmo/tinkergrassmo.github.io.git)
cd tinkergrassmo.github.io
```

**2. Install Node dependencies:**
The Docsy theme requires specific PostCSS plugins to compile correctly. Install them locally by running:

```bash
npm install
```

**3. Run the local server:**
Start the Hugo server, including draft pages (`-D`):

```bash
hugo server -D
```

**4. View the site:**
Open your web browser and navigate to: [http://localhost:1313](https://www.google.com/search?q=http://localhost:1313)

The development server includes live-reloading. Any changes you make to the Markdown files in the `content/` directory or configuration files will automatically refresh in your browser.

## Saving and Deploying Updates

This site is configured with GitHub Actions. Any changes pushed to the `main` branch will automatically build and deploy to GitHub Pages. To publish your updates, run:

```bash
# Stage all your changed files
git add .

# Commit your changes with a descriptive message
git commit -m "Update documentation and robotics research"

# Push to GitHub to trigger the automated deployment
git push origin main
```
