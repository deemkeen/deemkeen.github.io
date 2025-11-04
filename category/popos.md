---
layout: default
title: "Category: popos"
permalink: /category/popos/
---

# Posts in category: popos

<ul>
{% for post in site.categories.popos %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
  </li>
{% endfor %}
</ul>
