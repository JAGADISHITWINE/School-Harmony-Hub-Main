import { useEffect, useMemo, useState } from "react";
import { Barcode, BookOpen, ClipboardCheck, Pencil, Plus, RefreshCw, RotateCcw, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ListParams, Paginated } from "@/types";

interface BookRow {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher?: string | null;
  total_copies: number;
  available_copies: number;
}

interface IssueRow {
  id: string;
  book_id: string;
  student_id: string;
  issued_on: string;
  due_date: string;
  returned_on?: string | null;
  fine_amount: number;
  status: "issued" | "returned" | "overdue" | "lost";
}

interface StudentRow {
  id: string;
  full_name: string;
  roll_number: string;
}

const emptyPage = <T,>(): Paginated<T> => ({ data: [], total: 0, page: 1, pageSize: 10 });

const listFrom = <T,>(payload: any): Paginated<T> => {
  const rows =
    (Array.isArray(payload?.data?.items) && payload.data.items) ||
    (Array.isArray(payload?.data?.data) && payload.data.data) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return {
    data: rows,
    total: Number(payload?.data?.total ?? rows.length),
    page: Number(payload?.data?.page ?? 1),
    pageSize: Number(payload?.data?.page_size ?? payload?.data?.pageSize ?? rows.length ?? 10),
  };
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const L_PATTERNS: Record<string, string> = {
  "0": "0001101", "1": "0011001", "2": "0010011", "3": "0111101", "4": "0100011",
  "5": "0110001", "6": "0101111", "7": "0111011", "8": "0110111", "9": "0001011",
};
const G_PATTERNS: Record<string, string> = {
  "0": "0100111", "1": "0110011", "2": "0011011", "3": "0100001", "4": "0011101",
  "5": "0111001", "6": "0000101", "7": "0010001", "8": "0001001", "9": "0010111",
};
const R_PATTERNS: Record<string, string> = {
  "0": "1110010", "1": "1100110", "2": "1101100", "3": "1000010", "4": "1011100",
  "5": "1001110", "6": "1010000", "7": "1000100", "8": "1001000", "9": "1110100",
};
const PARITY: Record<string, string> = {
  "0": "LLLLLL", "1": "LLGLGG", "2": "LLGGLG", "3": "LLGGGL", "4": "LGLLGG",
  "5": "LGGLLG", "6": "LGGGLL", "7": "LGLGLG", "8": "LGLGGL", "9": "LGGLGL",
};

function Ean13Barcode({ value }: { value: string }) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) {
    return <span className="font-mono text-xs text-muted-foreground">{value}</span>;
  }
  const left = digits.slice(1, 7);
  const right = digits.slice(7);
  const parity = PARITY[digits[0]];
  const bits = `101${left.split("").map((digit, index) => (parity[index] === "L" ? L_PATTERNS : G_PATTERNS)[digit]).join("")}01010${right.split("").map((digit) => R_PATTERNS[digit]).join("")}101`;
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width="118" height="42" viewBox={`0 0 ${bits.length} 42`} role="img" aria-label={`Barcode ${digits}`} className="bg-white">
        {bits.split("").map((bit, index) => bit === "1" ? <rect key={index} x={index} y="2" width="1" height="34" fill="black" /> : null)}
      </svg>
      <span className="font-mono text-[10px] leading-none text-muted-foreground">{digits}</span>
    </div>
  );
}

export function LibraryModule() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const [tab, setTab] = useState("books");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bookParams, setBookParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [issueParams, setIssueParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [books, setBooks] = useState<Paginated<BookRow>>(emptyPage());
  const [issues, setIssues] = useState<Paginated<IssueRow>>(emptyPage());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [bookMode, setBookMode] = useState<"create" | "edit" | null>(null);
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [bookForm, setBookForm] = useState({ isbn: "", title: "", author: "", publisher: "", total_copies: "1" });
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ book_id: "", student_id: "", due_date: plusDays(14) });
  const [barcodeScan, setBarcodeScan] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({ issue_id: "", fine_per_day: "1" });

  const bookById = useMemo(() => new Map(books.data.map((book) => [book.id, book])), [books.data]);
  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const issuedCount = issues.data.filter((issue) => issue.status === "issued").length;
  const returnedCount = issues.data.filter((issue) => issue.status === "returned").length;

  const query = (params: ListParams, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(extra);
    q.set("page", String(params.page || 1));
    q.set("page_size", String(params.pageSize || 10));
    return q.toString();
  };

  const load = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [bookRes, issueRes, studentRes] = await Promise.all([
        api.get<any>(`/library/books?${query(bookParams, { institution_id: institutionId })}`),
        api.get<any>(`/library/issues?${query(issueParams)}`),
        api.get<any>("/students?page=1&page_size=100"),
      ]);
      setBooks(listFrom<BookRow>(bookRes));
      setIssues(listFrom<IssueRow>(issueRes));
      setStudents(listFrom<StudentRow>(studentRes).data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => toast.error("Failed to load library data"));
  }, [institutionId, bookParams.page, bookParams.pageSize, issueParams.page, issueParams.pageSize]);

  const filteredBooks = useMemo(() => {
    const search = (bookParams.search || "").toLowerCase().trim();
    if (!search) return books;
    return { ...books, data: books.data.filter((book) => [book.title, book.author, book.isbn, book.publisher].some((v) => (v || "").toLowerCase().includes(search))) };
  }, [books, bookParams.search]);

  const filteredIssues = useMemo(() => {
    const search = (issueParams.search || "").toLowerCase().trim();
    if (!search) return issues;
    return {
      ...issues,
      data: issues.data.filter((issue) => {
        const book = bookById.get(issue.book_id);
        const student = studentById.get(issue.student_id);
        return [book?.title, student?.full_name, student?.roll_number, issue.status].some((v) => (v || "").toLowerCase().includes(search));
      }),
    };
  }, [issues, issueParams.search, bookById, studentById]);

  const openCreateBook = () => {
    setEditingBook(null);
    setBookForm({ isbn: "", title: "", author: "", publisher: "", total_copies: "1" });
    setBookMode("create");
  };

  const openEditBook = (book: BookRow) => {
    setEditingBook(book);
    setBookForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher || "",
      total_copies: String(book.total_copies),
    });
    setBookMode("edit");
  };

  const saveBook = async () => {
    if (!institutionId) return;
    setBusy(true);
    try {
      const payload = {
        institution_id: institutionId,
        isbn: bookForm.isbn,
        title: bookForm.title,
        author: bookForm.author,
        publisher: bookForm.publisher || null,
        total_copies: Number(bookForm.total_copies || 1),
      };
      if (editingBook) {
        await api.patch(`/library/books/${editingBook.id}`, {
          title: payload.title,
          author: payload.author,
          total_copies: payload.total_copies,
        });
        toast.success("Book updated");
      } else {
        await api.post("/library/books", payload);
        toast.success("Book added");
      }
      setBookMode(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const issueBook = async () => {
    setBusy(true);
    try {
      await api.post("/library/issue", issueForm);
      toast.success("Book issued");
      setIssueOpen(false);
      setIssueForm({ book_id: "", student_id: "", due_date: plusDays(14) });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const applyBarcodeScan = (value: string) => {
    setBarcodeScan(value);
    const normalized = value.replace(/\D/g, "");
    const matched = books.data.find((book) => book.isbn === value || book.isbn.replace(/\D/g, "") === normalized);
    if (matched) {
      setIssueForm((prev) => ({ ...prev, book_id: matched.id }));
      toast.success("Book selected from barcode");
    }
  };

  const returnBook = async () => {
    setBusy(true);
    try {
      await api.post("/library/return", {
        issue_id: returnForm.issue_id,
        fine_per_day: Number(returnForm.fine_per_day || 1),
      });
      toast.success("Book returned");
      setReturnOpen(false);
      setReturnForm({ issue_id: "", fine_per_day: "1" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const bookColumns: Column<BookRow>[] = [
    { key: "title", header: "Book", cell: (row) => <div><div className="font-medium">{row.title}</div><div className="text-xs text-muted-foreground">{row.isbn}</div></div> },
    { key: "barcode", header: "Barcode", cell: (row) => <Ean13Barcode value={row.isbn} /> },
    { key: "author", header: "Author", cell: (row) => row.author },
    { key: "publisher", header: "Publisher", cell: (row) => row.publisher || "-" },
    { key: "copies", header: "Copies", cell: (row) => `${row.available_copies}/${row.total_copies}` },
  ];

  const issueColumns: Column<IssueRow>[] = [
    { key: "book", header: "Book", cell: (row) => bookById.get(row.book_id)?.title || row.book_id },
    {
      key: "student",
      header: "Student",
      cell: (row) => {
        const student = studentById.get(row.student_id);
        return student ? `${student.full_name} (${student.roll_number})` : row.student_id;
      },
    },
    { key: "issued_on", header: "Issued", cell: (row) => row.issued_on },
    { key: "due_date", header: "Due", cell: (row) => row.due_date },
    { key: "fine_amount", header: "Fine", cell: (row) => `Rs. ${Number(row.fine_amount || 0).toFixed(2)}` },
    { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Library"
        description="Manage book catalog, student issue records, returns and fine calculation."
        actions={
          <div className="flex flex-wrap gap-2">
            <BulkImportTools resource="library-books" label="Library Books" onImported={load} />
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            <Button variant="outline" onClick={() => setIssueOpen(true)}><Send className="mr-2 h-4 w-4" /> Issue</Button>
            <Button onClick={openCreateBook}><Plus className="mr-2 h-4 w-4" /> Book</Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Books" value={books.total} icon={BookOpen} accent="primary" />
        <StatCard label="Available Copies" value={books.data.reduce((sum, book) => sum + Number(book.available_copies || 0), 0)} icon={ClipboardCheck} accent="green" />
        <StatCard label="Issued" value={issuedCount} icon={Users} accent="blue" />
        <StatCard label="Returned" value={returnedCount} icon={RotateCcw} accent="purple" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <DataTable
            columns={bookColumns}
            data={filteredBooks}
            loading={loading}
            params={bookParams}
            onParamsChange={setBookParams}
            searchPlaceholder="Search books..."
            rowActions={(row) => (
              <Button size="sm" variant="ghost" onClick={() => openEditBook(row)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="issues">
          <DataTable
            columns={issueColumns}
            data={filteredIssues}
            loading={loading}
            params={issueParams}
            onParamsChange={setIssueParams}
            searchPlaceholder="Search issue records..."
            rowActions={(row) => row.status === "issued" ? (
              <Button size="sm" variant="ghost" onClick={() => { setReturnForm({ issue_id: row.id, fine_per_day: "1" }); setReturnOpen(true); }}>
                <RotateCcw className="mr-2 h-4 w-4" /> Return
              </Button>
            ) : null}
          />
        </TabsContent>
      </Tabs>

      <FormModal
        open={bookMode !== null}
        onOpenChange={(open) => !open && setBookMode(null)}
        title={editingBook ? "Edit Book" : "Add Book"}
        onSubmit={saveBook}
        busy={busy}
      >
        <FieldGrid>
          <Field label="ISBN / Barcode"><Input value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} disabled={!!editingBook} /></Field>
          <Field label="Total Copies"><Input type="number" min="1" value={bookForm.total_copies} onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })} /></Field>
          <Field label="Title"><Input value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} /></Field>
          <Field label="Author"><Input value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} /></Field>
          <Field label="Publisher" className="sm:col-span-2"><Input value={bookForm.publisher} onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })} /></Field>
        </FieldGrid>
      </FormModal>

      <FormModal open={issueOpen} onOpenChange={setIssueOpen} title="Issue Book" onSubmit={issueBook} busy={busy} submitLabel="Issue">
        <FieldGrid>
          <Field label="Scan Barcode / ISBN" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input
                value={barcodeScan}
                onChange={(e) => applyBarcodeScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyBarcodeScan(barcodeScan);
                  }
                }}
                placeholder="Scan or type ISBN barcode"
              />
              <Button type="button" variant="outline" onClick={() => applyBarcodeScan(barcodeScan)}>
                <Barcode className="mr-2 h-4 w-4" /> Find
              </Button>
            </div>
          </Field>
          <Field label="Book">
            <Select value={issueForm.book_id} onValueChange={(book_id) => setIssueForm({ ...issueForm, book_id })}>
              <SelectTrigger><SelectValue placeholder="Select book" /></SelectTrigger>
              <SelectContent>{books.data.filter((book) => book.available_copies > 0).map((book) => <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Student">
            <Select value={issueForm.student_id} onValueChange={(student_id) => setIssueForm({ ...issueForm, student_id })}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.full_name} ({student.roll_number})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Issue Date"><Input value={today()} disabled /></Field>
          <Field label="Due Date"><Input type="date" value={issueForm.due_date} onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })} /></Field>
        </FieldGrid>
      </FormModal>

      <FormModal open={returnOpen} onOpenChange={setReturnOpen} title="Return Book" onSubmit={returnBook} busy={busy} submitLabel="Return">
        <FieldGrid>
          <Field label="Issue ID"><Input value={returnForm.issue_id} disabled /></Field>
          <Field label="Fine Per Day"><Input type="number" min="0" step="0.5" value={returnForm.fine_per_day} onChange={(e) => setReturnForm({ ...returnForm, fine_per_day: e.target.value })} /></Field>
        </FieldGrid>
      </FormModal>
    </div>
  );
}
