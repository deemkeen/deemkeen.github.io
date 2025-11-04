---
layout: default
title: "Category: linux"
permalink: /category/linux/
---

# Posts in category: linux

<ul>
{% for post in site.categories.linux %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
  </li>
{% endfor %}
</ul>
