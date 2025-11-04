---
layout: default
title: "Category: nerdstuff"
permalink: /category/nerdstuff/
---

# Posts in category: nerdstuff

<ul>
{% for post in site.categories.nerdstuff %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
  </li>
{% endfor %}
</ul>
