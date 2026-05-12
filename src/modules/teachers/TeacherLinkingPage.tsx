import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

type Option = { id: string; name: string; class_id?: string };
type YearOption = { id: string; label: string };
type TeacherOption = { id: string; full_name: string; employee_code: string };
type HODLinkOption = {
  id: string;
  hod_teacher_id: string;
  hod_teacher_name: string;
  institution_id: string;
  course_id: string;
  course_name: string;
  branch_id: string;
  branch_name: string;
};
type SubjectOption = { id: string; name: string; code: string; branch_id: string; class_id: string };
type TeacherHodSubjectRow = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  hod_link_id: string;
  hod_teacher_id: string;
  hod_teacher_name: string;
  institution_id: string;
  course_id: string;
  course_name: string;
  branch_id: string;
  branch_name: string;
  class_id?: string | null;
  class_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  subject_id: string;
  subject_name: string;
};

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

export function TeacherLinkingPage() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";

  const [years, setYears] = useState<YearOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [hodLinks, setHodLinks] = useState<HODLinkOption[]>([]);
  const [rows, setRows] = useState<TeacherHodSubjectRow[]>([]);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [academicYearId, setAcademicYearId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  const selectedTeacher = useMemo(() => teachers.find((t) => t.id === teacherId) || null, [teachers, teacherId]);
  const selectedHodLink = useMemo(() => hodLinks.find((h) => h.branch_id === branchId && h.course_id === courseId) || null, [hodLinks, branchId, courseId]);
  const validLinkCount = useMemo(() => {
    return sectionIds.reduce((count, nextSectionId) => {
      const section = sections.find((item) => item.id === nextSectionId);
      if (!section?.class_id) return count;
      return count + subjectIds.filter((id) => subjects.find((subject) => subject.id === id)?.class_id === section.class_id).length;
    }, 0);
  }, [sectionIds, sections, subjectIds, subjects]);

  const loadBase = async () => {
    if (!institutionId) return;
    const [yearRes, teacherRes, courseRes] = await Promise.all([
      api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=500`),
      api.get<any>("/teachers?page=1&page_size=500"),
      api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=500`),
    ]);
    const nextYears = listFrom<any>(yearRes).map((x) => ({ id: x.id, label: x.label || x.name }));
    setYears(nextYears);
    setAcademicYearId((prev) => prev || nextYears[0]?.id || "");
    setTeachers(listFrom<any>(teacherRes).map((x) => ({ id: x.id, full_name: x.full_name, employee_code: x.employee_code })));
    setCourses(listFrom<any>(courseRes).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadBranches = async () => {
    if (!courseId) return setBranches([]);
    const res = await api.get<any>(`/branches?course_id=${courseId}&page=1&page_size=500`);
    setBranches(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadClasses = async () => {
    if (!branchId) return setClasses([]);
    const params = new URLSearchParams({ branch_id: branchId, page: "1", page_size: "500" });
    if (academicYearId) params.set("academic_year_id", academicYearId);
    const res = await api.get<any>(`/classes?${params.toString()}`);
    setClasses(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadSections = async () => {
    if (classIds.length === 0) return setSections([]);
    const responses = await Promise.all(
      classIds.map((nextClassId) => api.get<any>(`/sections?class_id=${nextClassId}&page=1&page_size=500`))
    );
    setSections(
      responses.flatMap((res, index) =>
        listFrom<any>(res).map((x) => ({ id: x.id, name: x.name, class_id: x.class_id || classIds[index] }))
      )
    );
  };

  const loadSubjects = async () => {
    if (!branchId || classIds.length === 0) return setSubjects([]);
    const responses = await Promise.all(
      classIds.map((nextClassId) => {
        const params = new URLSearchParams({ branch_id: branchId, class_id: nextClassId, page: "1", page_size: "500" });
        if (academicYearId) params.set("academic_year_id", academicYearId);
        return api.get<any>(`/subjects?${params.toString()}`);
      })
    );
    setSubjects(
      responses.flatMap((res, index) =>
        listFrom<any>(res).map((x) => ({
          id: x.id,
          name: x.name,
          code: x.code,
          branch_id: x.branch_id,
          class_id: x.class_id || classIds[index],
        }))
      )
    );
  };

  const loadHodLinks = async () => {
    if (!institutionId) return;
    const params = new URLSearchParams({ institution_id: institutionId });
    if (courseId) params.set("course_id", courseId);
    if (branchId) params.set("branch_id", branchId);
    const res = await api.get<any>(`/teachers/links/hod?${params.toString()}`);
    setHodLinks(listFrom<HODLinkOption>(res));
  };

  const loadRows = async () => {
    if (!institutionId) return;
    const params = new URLSearchParams({ institution_id: institutionId });
    if (courseId) params.set("course_id", courseId);
    if (branchId) params.set("branch_id", branchId);
    const res = await api.get<any>(`/teachers/links/teacher-hod-subjects?${params.toString()}`);
    setRows(listFrom<TeacherHodSubjectRow>(res));
  };

  useEffect(() => { loadBase().catch(() => toast.error("Failed to load setup data")); }, [institutionId]);
  useEffect(() => {
    if (!editingLinkId) {
      setBranchId(""); setClassIds([]); setSectionIds([]); setSubjectIds([]);
    }
    loadBranches().catch(() => toast.error("Failed to load branches"));
    loadHodLinks().catch(() => toast.error("Failed to load HOD links"));
    loadRows().catch(() => toast.error("Failed to load links"));
  }, [courseId]);
  useEffect(() => {
    if (!editingLinkId) {
      setClassIds([]); setSectionIds([]); setSubjectIds([]);
    }
    loadClasses().catch(() => toast.error("Failed to load classes"));
    loadHodLinks().catch(() => toast.error("Failed to load HOD links"));
    loadRows().catch(() => toast.error("Failed to load links"));
  }, [branchId, academicYearId]);
  useEffect(() => {
    if (!editingLinkId) {
      setSectionIds([]); setSubjectIds([]);
    }
    loadSections().catch(() => toast.error("Failed to load sections"));
    loadSubjects().catch(() => toast.error("Failed to load subjects"));
  }, [classIds.join("|")]);

  const resetForm = () => {
    setEditingLinkId(null);
    setTeacherId("");
    setCourseId("");
    setBranchId("");
    setClassIds([]);
    setSectionIds([]);
    setSubjectIds([]);
  };

  const saveLink = async () => {
    if (saving) return;
    if (!teacherId || !selectedHodLink || classIds.length === 0 || sectionIds.length === 0 || subjectIds.length === 0) {
      toast.error("Select teacher, branch, class, section and subject");
      return;
    }
    if (!editingLinkId && validLinkCount === 0) {
      toast.error("Select matching sections and subjects for the selected classes");
      return;
    }
    setSaving(true);
    try {
      if (editingLinkId) {
        await api.patch(`/teachers/links/teacher-hod-subjects/${editingLinkId}`, {
          teacher_id: teacherId,
          hod_link_id: selectedHodLink.id,
          section_id: sectionIds[0],
          subject_id: subjectIds[0],
        });
        toast.success("Teacher link updated");
      } else {
        let createdCount = 0;
        let skippedCount = 0;
        for (const nextSectionId of sectionIds) {
          const section = sections.find((item) => item.id === nextSectionId);
          const matchingSubjectIds = subjectIds.filter((id) => subjects.find((subject) => subject.id === id)?.class_id === section?.class_id);
          if (matchingSubjectIds.length === 0) continue;
          const response = await api.post<any>("/teachers/links/teacher-hod-subjects", {
            teacher_id: teacherId,
            hod_link_id: selectedHodLink.id,
            section_id: nextSectionId,
            subject_ids: matchingSubjectIds,
          });
          createdCount += Number(response?.data?.created_count || 0);
          skippedCount += Number(response?.data?.skipped_count || 0);
        }
        if (createdCount > 0 && skippedCount > 0) {
          toast.success(`${createdCount} teacher links created. ${skippedCount} duplicate links skipped.`);
        } else if (createdCount > 0) {
          toast.success(`${createdCount} teacher links created`);
        } else {
          toast.info("All selected teacher links already exist");
        }
      }
      resetForm();
      await loadRows();
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (id: string) => {
    await api.delete(`/teachers/links/teacher-hod-subjects/${id}`);
    toast.success("Teacher link removed");
    await loadRows();
  };

  const startEdit = (row: TeacherHodSubjectRow) => {
    setEditingLinkId(row.id);
    setTeacherId(row.teacher_id);
    setCourseId(row.course_id);
    setBranchId(row.branch_id);
    setClassIds(row.class_id ? [row.class_id] : []);
    setSectionIds(row.section_id ? [row.section_id] : []);
    setSubjectIds([row.subject_id]);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Teacher Linking" description="Link teachers to academic year, class, section and subject." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4 space-y-4">
          <div className="flex flex-col gap-2 border-b pb-4">
            <p className="text-sm font-semibold">Bulk Upload Teacher Links</p>
            <BulkImportTools resource="teacher-links" label="Teacher Links" onImported={loadRows} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Academic Year" value={academicYearId} onValueChange={setAcademicYearId} items={years.map((y) => ({ id: y.id, name: y.label }))} placeholder="Select year" />
            <SelectField label="Teacher" value={teacherId} onValueChange={setTeacherId} items={teachers.map((t) => ({ id: t.id, name: `${t.full_name} (${t.employee_code})` }))} placeholder="Select teacher" />
            <SelectField label="Course" value={courseId} onValueChange={setCourseId} items={courses} placeholder="Select course" />
            <SelectField label="Branch" value={branchId} onValueChange={setBranchId} items={branches} placeholder="Select branch" />
            <MultiSelectField
              label="Classes / Semesters"
              values={classIds}
              onValuesChange={setClassIds}
              items={classes}
              placeholder="Select classes"
              single={Boolean(editingLinkId)}
            />
            <MultiSelectField
              label="Sections"
              values={sectionIds}
              onValuesChange={setSectionIds}
              items={sections}
              placeholder="Select sections"
              single={Boolean(editingLinkId)}
            />
            <MultiSelectField
              label="Subjects"
              values={subjectIds}
              onValuesChange={setSubjectIds}
              items={subjects.map((s) => ({ id: s.id, name: `${s.name} (${s.code})` }))}
              placeholder="Select subjects"
              single={Boolean(editingLinkId)}
            />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold">Selection Summary</p>
          <div className="text-sm"><span className="text-muted-foreground">Teacher:</span> {selectedTeacher ? `${selectedTeacher.full_name} (${selectedTeacher.employee_code})` : "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">HOD Link:</span> {selectedHodLink ? selectedHodLink.hod_teacher_name : "Not mapped"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Classes:</span> {classIds.length || "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Sections:</span> {sectionIds.length || "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Subjects:</span> {subjectIds.length || "-"}</div>
          {!editingLinkId && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              This will create {validLinkCount} valid link{validLinkCount === 1 ? "" : "s"}.
            </div>
          )}
          <Button className="w-full" disabled={saving} onClick={() => saveLink().catch((e: any) => toast.error(e?.message || "Failed to save teacher link"))}>
            {saving ? "Saving..." : editingLinkId ? "Update Link" : "Link Selected"}
          </Button>
          {editingLinkId && <Button variant="outline" className="w-full" onClick={resetForm}>Cancel Edit</Button>}
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">Linked Records</p>
        <div className="overflow-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left text-xs uppercase">Teacher</th>
                <th className="border p-2 text-left text-xs uppercase">HOD</th>
                <th className="border p-2 text-left text-xs uppercase">Course / Branch</th>
                <th className="border p-2 text-left text-xs uppercase">Class / Section</th>
                <th className="border p-2 text-left text-xs uppercase">Subject</th>
                <th className="border p-2 text-left text-xs uppercase">Edit</th>
                <th className="border p-2 text-left text-xs uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="border p-3 text-sm text-muted-foreground">No teacher links found.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2 text-sm">{r.teacher_name}</td>
                  <td className="border p-2 text-sm">{r.hod_teacher_name}</td>
                  <td className="border p-2 text-sm">{r.course_name} / {r.branch_name}</td>
                  <td className="border p-2 text-sm">{r.class_name || "-"} / {r.section_name || "-"}</td>
                  <td className="border p-2 text-sm">{r.subject_name}</td>
                  <td className="border p-2"><Button variant="ghost" size="icon" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button></td>
                  <td className="border p-2"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeLink(r.id).catch(() => toast.error("Failed to remove link"))}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SelectField({ label, value, onValueChange, items, placeholder }: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: Option[];
  placeholder: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <SearchableSelect
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        options={items.map((item) => ({ value: item.id, label: item.name }))}
      />
    </div>
  );
}

function MultiSelectField({
  label,
  values,
  onValuesChange,
  items,
  placeholder,
  single = false,
}: {
  label: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  items: Option[];
  placeholder: string;
  single?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedItems = items.filter((item) => values.includes(item.id));
  const selectedText =
    selectedItems.length === 0
      ? placeholder
      : single
        ? selectedItems[0]?.name
        : `${selectedItems.length} selected`;

  const toggle = (id: string) => {
    if (single) {
      onValuesChange([id]);
      setOpen(false);
      return;
    }
    onValuesChange(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="h-9 w-full justify-between px-3 font-normal">
            <span className={cn("truncate", selectedItems.length === 0 && "text-muted-foreground")}>{selectedText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              {!single && items.length > 0 && (
                <div className="flex gap-2 border-b p-2">
                  <Button type="button" size="sm" variant="outline" className="h-8 flex-1" onClick={() => onValuesChange(items.map((item) => item.id))}>
                    Select All
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-8 flex-1" onClick={() => onValuesChange([])}>
                    Clear
                  </Button>
                </div>
              )}
              <CommandGroup>
                {items.map((item) => {
                  const checked = values.includes(item.id);
                  return (
                    <CommandItem key={item.id} value={item.name} onSelect={() => toggle(item.id)}>
                      <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{item.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1">
              {item.name}
              <button type="button" onClick={() => onValuesChange(values.filter((value) => value !== item.id))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
