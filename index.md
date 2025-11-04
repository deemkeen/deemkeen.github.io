---
layout: default
title: deemlog
---

## Latest Posts

{% for post in site.posts %}
  <article>
    <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
    <p class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</p>
    {{ post.excerpt }}
  </article>
{% endfor %}
