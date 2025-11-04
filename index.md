---
layout: page
title: latest posts
---

{% for post in site.posts %}
  <article>
    <p class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</p>
    <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
  </article>
{% endfor %}
