# Personal Blog

A personal blog built with Jekyll and hosted on GitHub Pages.

## Setup Instructions

### Prerequisites

- Git installed on your computer
- Ruby and Bundler (optional, for local testing)
- A GitHub account

### Deploying to GitHub Pages

1. **Create a new repository on GitHub**
   - Go to [GitHub](https://github.com/new)
   - Name it: `deemkeen.github.io` (replace with your username)
   - Make it public
   - Don't initialize with README (we already have files)

2. **Push your local repository to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit: Jekyll blog setup"
   git branch -M main
   git remote add origin https://github.com/deemkeen/deemkeen.github.io.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository settings on GitHub
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Select the `main` branch and `/ (root)` folder
   - Click Save

4. **Wait a few minutes**
   - GitHub will build your site automatically
   - Your blog will be live at: `https://deemkeen.github.io`

### Customizing Your Blog

Edit `_config.yml` to personalize your blog:
- Change `title` to your blog's name
- Update `email` with your email address
- Modify `description` to describe your blog
- Update `author` information

### Writing New Posts

1. Create a new file in the `_posts` directory
2. Name it: `YYYY-MM-DD-title-of-post.md` (e.g., `2025-11-04-my-first-post.md`)
3. Add front matter at the top:
   ```yaml
   ---
   layout: post
   title: "Your Post Title"
   date: YYYY-MM-DD HH:MM:SS +0000
   categories: category1 category2
   ---
   ```
4. Write your content below using Markdown
5. Commit and push to GitHub

### Local Development (Optional)

To preview your blog locally before pushing to GitHub:

```bash
# Install dependencies
bundle install

# Run the local server
bundle exec jekyll serve

# Visit http://localhost:4000 in your browser
```

### Changing the Theme

The default theme is Minima. To use a different GitHub Pages supported theme:

1. Edit `_config.yml`
2. Change the `theme` line to one of the [supported themes](https://pages.github.com/themes/)
3. Commit and push

## Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Markdown Guide](https://www.markdownguide.org/)

## License

This project is open source and available under the MIT License.
