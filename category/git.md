---
layout: page
title: git
permalink: /category/git/
---

<ul>
{% for post in site.categories.git %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
