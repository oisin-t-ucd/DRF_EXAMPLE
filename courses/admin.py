# api_app/admin.py
from django.contrib import admin

from .models import Course, Lesson, Tag

# 1. Register the Tag model normally
admin.site.register(Tag)


# 2. Create an Inline for Lessons
class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1  # Provides one blank row for a new lesson by default


# 3. Customize the Course Admin to include the Lesson Inline
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "instructor", "is_active")
    list_filter = ("is_active", "tags")
    search_fields = ("title", "description")

    # Attach the inline here!
    inlines = [LessonInline]


# 4. Register the Course model with its custom Admin class
admin.site.register(Course, CourseAdmin)
